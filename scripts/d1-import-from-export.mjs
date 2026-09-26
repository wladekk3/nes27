import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , inputArg, outputArg, chunkArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/d1-import-from-export.mjs <export.json> <output.sql> [--chunk-size=250]");
  process.exit(1);
}
const chunkSize = chunkArg?.startsWith("--chunk-size=") ? Number(chunkArg.split("=")[1]) : 0;
if (chunkSize && (!Number.isInteger(chunkSize) || chunkSize < 1)) throw new Error("Invalid chunk size");

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const payload = JSON.parse(readFileSync(inputPath, "utf8"));
if (!payload?.tables || typeof payload.tables !== "object") {
  throw new Error("Invalid NE S27 database export: missing tables");
}

const identifier = (value) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
};

const literal = (value) => {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number in export: ${value}`);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  throw new Error(`Unsupported exported value type: ${typeof value}`);
};

const statements = [];
let totalRows = 0;

const tableEntries = Object.entries(payload.tables).sort(([left], [right]) => {
  if (left === "users") return -1;
  if (right === "users") return 1;
  return left.localeCompare(right);
});
for (const [tableName, table] of tableEntries) {
  const columns = table?.columns;
  const rows = table?.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows)) throw new Error(`Invalid table payload: ${tableName}`);
  if (!rows.length) continue;
  const columnSql = columns.map(identifier).join(", ");
  for (const row of rows) {
    const values = columns.map((column) => literal(row[column])).join(", ");
    statements.push(`INSERT OR REPLACE INTO ${identifier(tableName)} (${columnSql}) VALUES (${values});`);
    totalRows += 1;
  }
}

const wrap = (body, optimize = false) => [
  "PRAGMA foreign_keys = ON;",
  ...body,
  ...(optimize ? ["PRAGMA optimize;"] : []),
].join("\n") + "\n";

if (!chunkSize) {
  writeFileSync(outputPath, wrap(statements, true), { mode: 0o600 });
  console.log(`Wrote ${totalRows} rows from ${tableEntries.length} tables to ${outputPath}`);
} else {
  const stem = outputPath.replace(/\.sql$/i, "");
  const files = [];
  for (let offset = 0; offset < statements.length; offset += chunkSize) {
    const index = String(files.length).padStart(3, "0");
    const file = `${stem}-${index}.sql`;
    writeFileSync(file, wrap(statements.slice(offset, offset + chunkSize), offset + chunkSize >= statements.length), { mode: 0o600 });
    files.push(file);
  }
  console.log(`Wrote ${totalRows} rows from ${tableEntries.length} tables to ${files.length} chunks (${stem}-*.sql)`);
}
