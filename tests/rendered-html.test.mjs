import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test('mythic metadata and art are unavailable without a session', async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url));
 const runtime={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};
 const ctx={waitUntil(){},passThroughOnException(){}};
 const info=await worker.fetch(new Request('http://localhost/api/card-info'),runtime,ctx);
 assert.deepEqual((await info.json()).cards,[]);
 for(const slug of ['manager','founders','heart-zone','last-score','vice-city-king','case-27','noosphere-archive']){
 const art=await worker.fetch(new Request('http://localhost/api/card-art?id='+slug),runtime,ctx);
 assert.equal(art.status,404);
 assert.match(art.headers.get('cache-control'),/no-store/);
 }
});
