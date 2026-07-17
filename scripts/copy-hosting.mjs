import { cp, mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await mkdir("dist/server", { recursive: true });
await writeFile(
  "dist/server/index.js",
  `export default {
  async fetch(request, env) {
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }
    return new Response("Cellar Note AI", { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
};
`
);
