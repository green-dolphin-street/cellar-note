import { NextResponse } from "next/server";

export const runtime = "nodejs";

const schema = {
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
  required: ["name", "winery", "vintage", "country", "region", "grapes", "type", "confidence", "status", "summary", "crowd", "funFact", "pairing", "sources"]
};

export async function POST(request) {
  const file = (await request.formData()).get("image");
  if (!file || typeof file === "string") return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "12MB 이하 이미지를 사용해 주세요." }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      demo: true,
      wine: {
        name: "새 와인 (AI 연결 필요)", winery: "라벨에서 확인 필요", vintage: "", country: "미확인", region: "미확인",
        grapes: [], type: "기타", confidence: 0, status: "확인 필요",
        summary: "사진 업로드는 정상 동작했습니다. 실제 인식을 켜려면 서버에 OPENAI_API_KEY를 연결하세요.",
        crowd: "와인이 식별되면 공개된 출처를 바탕으로 코멘트 경향을 요약합니다.",
        funFact: "확인되지 않은 사실은 추측하지 않도록 설계했습니다.", pairing: "정보 확인 후 추천", sources: []
      }
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  const image = `data:${file.type};base64,${btoa(binary)}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "와인 라벨 사진을 분석해 한국어로 구조화하라. 라벨에 보이는 사실과 일반 지식을 구분하고, 확신이 없으면 미확인으로 표시하라. 실제 웹 검색을 하지 않았으므로 sources는 비워 두고, crowd에는 특정 사용자 평점을 만들어내지 말라." },
          { type: "input_image", image_url: image, detail: "high" }
        ]
      }],
      text: { format: { type: "json_schema", name: "wine_label", strict: true, schema } }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: `AI 분석 오류: ${detail.slice(0, 180)}` }, { status: 502 });
  }
  const result = await response.json();
  const text = result.output_text || result.output?.flatMap(o => o.content || []).find(c => c.type === "output_text")?.text;
  return NextResponse.json({ wine: JSON.parse(text) });
}
