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
const wineSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    winery: { type: "string" },
    vintage: { type: "string" },
    country: { type: "string" },
    region: { type: "string" },
    grapes: { type: "array", items: { type: "string" } },
    type: { type: "string", enum: ["레드", "화이트", "로제", "스파클링", "주정강화", "기타"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    status: { type: "string", enum: ["확인됨", "부분 확인", "확인 필요"] },
    summary: { type: "string" },
    crowd: { type: "string" },
    funFact: { type: "string" },
    pairing: { type: "string" },
    consumedFoods: { type: "array", items: { type: "string" } },
    foodNote: { type: "string" },
    foodConfidence: { type: "integer", minimum: 0, maximum: 100 },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { label: { type: "string" }, url: { type: "string" } },
        required: ["label", "url"]
      }
    }
  },
  required: ["name", "winery", "vintage", "country", "region", "grapes", "type", "confidence", "status", "summary", "crowd", "funFact", "pairing", "consumedFoods", "foodNote", "foodConfidence", "sources"]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function analyze(request, env) {
  if (!env.UPLOAD_ACCESS_CODE || request.headers.get("x-upload-code") !== env.UPLOAD_ACCESS_CODE) {
    return json({ error: "업로드 권한이 없습니다." }, 401);
  }
  if (!env.OPENAI_API_KEY) {
    return json({ error: "OpenAI API 키가 아직 연결되지 않았습니다." }, 503);
  }
  const body = await request.json();
  if (!body.image || !body.image.startsWith("data:image/")) {
    return json({ error: "올바른 이미지가 필요합니다." }, 400);
  }
  if (body.image.length > 16000000) {
    return json({ error: "이미지가 너무 큽니다. 12MB 이하 사진을 사용하세요." }, 413);
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      tools: [{ type: "web_search" }],
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: "사진 속 와인 라벨과 주변 음식을 분석하라. 와인명·와이너리·빈티지·국가·산지·품종을 식별하고, 웹 검색으로 공식 정보와 다수 사용자 코멘트의 공통 경향을 검증하라. 추천 페어링(pairing)과 사진에서 실제로 함께 먹은 음식(consumedFoods)을 반드시 구분하라. 음식이 없거나 불명확하면 빈 배열과 낮은 신뢰도를 반환하라. 추측을 사실처럼 쓰지 말고, 실제 확인한 출처 URL만 sources에 넣어라. 모든 설명은 한국어로 작성하라."
          },
          { type: "input_image", image_url: body.image, detail: "high" }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "wine_record",
          strict: true,
          schema: wineSchema
        }
      }
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    return json({ error: "AI 분석 오류: " + detail.slice(0, 240) }, 502);
  }
  const result = await response.json();
  const output = result.output_text || result.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
  if (!output) return json({ error: "AI가 분석 결과를 반환하지 않았습니다." }, 502);
  try {
    return json({ wine: JSON.parse(output) });
  } catch {
    return json({ error: "AI 결과 형식을 읽지 못했습니다." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze" && request.method === "POST") {
      return analyze(request, env);
    }
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
