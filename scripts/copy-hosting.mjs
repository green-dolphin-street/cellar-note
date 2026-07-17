import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await mkdir("dist/server", { recursive: true });

let html = await readFile("dist/index.html", "utf8");
const scriptPath = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];

if (!scriptPath) throw new Error("Vite script bundle not found");

let script = await readFile(resolve("dist", scriptPath.replace(/^\//, "")), "utf8");
for (const name of ["sample1.jpg", "sample2.jpg", "sample3.jpg"]) {
  const bytes = await readFile(resolve("public", name));
  const dataUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  script = script.replaceAll(`/${name}`, dataUrl);
}

html = html.replace(
  /<script[^>]+src="[^"]+"[^>]*><\/script>/,
  () => `<script type="module">${script.replaceAll("</script>", "<\\/script>")}</script>`
);

if (stylePath) {
  const style = await readFile(resolve("dist", stylePath.replace(/^\//, "")), "utf8");
  html = html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>${style}</style>`);
}

await writeFile(
  "dist/server/index.js",
  `const html = ${JSON.stringify(html)};
export default {
  async fetch() {
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60"
      }
    });
  }
};
`
);
