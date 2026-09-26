import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const MAGIC = Buffer.from("NES27M1\0");
const PRIVATE_KEY_PREFIX = Buffer.from("302e020100300506032b656e04220420", "hex");
const INFO = Buffer.from("ne-s27-production-d1-migration-v1");
const PUBLIC_KEY_BYTES = 44;

function privateKeyFromToken(token) {
  if (!token) throw new Error("Missing MIGRATION_KEY_SOURCE");
  const seed = createHash("sha256")
    .update("ne-s27-migration-v1\0")
    .update(token)
    .digest();
  return createPrivateKey({
    key: Buffer.concat([PRIVATE_KEY_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

function publicKeyBytes(key) {
  return Buffer.from(createPublicKey(key).export({ format: "der", type: "spki" }));
}

function deriveKey(sharedSecret, salt) {
  return Buffer.from(hkdfSync("sha256", sharedSecret, salt, INFO, 32));
}

function printPublicKey() {
  const privateKey = privateKeyFromToken(process.env.MIGRATION_KEY_SOURCE);
  process.stdout.write(`S27_MIGRATION_PUBLIC_KEY=${publicKeyBytes(privateKey).toString("base64")}\n`);
}

function encrypt(inputPath, outputPath, recipientPublicKeyBase64) {
  const recipientPublicKey = createPublicKey({
    key: Buffer.from(recipientPublicKeyBase64, "base64"),
    format: "der",
    type: "spki",
  });
  const ephemeral = generateKeyPairSync("x25519");
  const ephemeralPublicKey = Buffer.from(
    ephemeral.publicKey.export({ format: "der", type: "spki" }),
  );
  if (ephemeralPublicKey.length !== PUBLIC_KEY_BYTES) {
    throw new Error("Unexpected X25519 public key size");
  }
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  const key = deriveKey(
    diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipientPublicKey }),
    salt,
  );
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(MAGIC);
  const ciphertext = Buffer.concat([
    cipher.update(readFileSync(inputPath)),
    cipher.final(),
  ]);
  writeFileSync(
    outputPath,
    Buffer.concat([MAGIC, ephemeralPublicKey, salt, iv, cipher.getAuthTag(), ciphertext]),
    { mode: 0o600 },
  );
}

function decrypt(inputPath, outputPath) {
  const payload = readFileSync(inputPath);
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Invalid migration payload");
  }
  let offset = MAGIC.length;
  const ephemeralPublicKey = createPublicKey({
    key: payload.subarray(offset, offset += PUBLIC_KEY_BYTES),
    format: "der",
    type: "spki",
  });
  const salt = payload.subarray(offset, offset += 32);
  const iv = payload.subarray(offset, offset += 12);
  const tag = payload.subarray(offset, offset += 16);
  const privateKey = privateKeyFromToken(process.env.MIGRATION_KEY_SOURCE);
  const key = deriveKey(
    diffieHellman({ privateKey, publicKey: ephemeralPublicKey }),
    salt,
  );
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  writeFileSync(
    outputPath,
    Buffer.concat([decipher.update(payload.subarray(offset)), decipher.final()]),
    { mode: 0o600 },
  );
}

const [mode, ...args] = process.argv.slice(2);
if (mode === "public") printPublicKey();
else if (mode === "encrypt" && args.length === 3) encrypt(args[0], args[1], args[2]);
else if (mode === "decrypt" && args.length === 2) decrypt(args[0], args[1]);
else throw new Error("Usage: public | encrypt <input> <output> <public-key> | decrypt <input> <output>");
