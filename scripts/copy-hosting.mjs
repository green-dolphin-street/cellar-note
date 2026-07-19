import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
await mkdir("dist/.openai",{recursive:true});await cp(".openai/hosting.json","dist/.openai/hosting.json");await mkdir("dist/server",{recursive:true});
let html=await readFile("dist/index.html","utf8");const sp=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1],css=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];if(!sp)throw Error("bundle not found");
let script=await readFile(resolve("dist",sp.replace(/^\//,"")),"utf8");
for(const name of ["sample1.jpg","sample2.jpg","sample3.jpg","dionysus-hero.png"]){const b=await readFile(resolve("public",name));const mime=name.endsWith(".png")?"image/png":"image/jpeg";script=script.replaceAll(`/${name}`,`data:${mime};base64,${b.toString("base64")}`)}
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script type="module">${script.replaceAll("</script>","<\\/script>")}</script>`);
if(css){const s=await readFile(resolve("dist",css.replace(/^\//,"")),"utf8");html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${s}</style>`)}
const fields=["name","winery","vintage","country","region","appellation","type","status","summary","crowd","funFact","pairing","foodNote","consumedDate","location","vivinoRating","vivinoUrl","wsScore","officialUrl","priceKrw","purchasedAt","alcohol","personalRating"];
const props=Object.fromEntries(fields.map(k=>[k,{type:"string"}]));Object.assign(props,{grapes:{type:"array",items:{type:"string"}},confidence:{type:"integer",minimum:0,maximum:100},consumedFoods:{type:"array",items:{type:"string"}},foodConfidence:{type:"integer",minimum:0,maximum:100},sources:{type:"array",items:{type:"object",additionalProperties:false,properties:{label:{type:"string"},url:{type:"string"}},required:["label","url"]}}});
const schema={type:"object",additionalProperties:false,properties:props,required:[...fields,"grapes","confidence","consumedFoods","foodConfidence","sources"]};
await writeFile("dist/server/index.js",`const html=${JSON.stringify(html)},schema=${JSON.stringify(schema)};
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8"}});
function allowed(r,e){return !!e.UPLOAD_ACCESS_CODE&&r===e.UPLOAD_ACCESS_CODE}
function dbReady(e){return !!e.SUPABASE_URL&&!!e.SUPABASE_SERVICE_ROLE_KEY}
function dbFetch(e,path,options={}){
 const headers=new Headers(options.headers||{});headers.set("apikey",e.SUPABASE_SERVICE_ROLE_KEY);headers.set("authorization","Bearer "+e.SUPABASE_SERVICE_ROLE_KEY);
 return fetch(e.SUPABASE_URL.replace(/\\/$/,"")+path,{...options,headers});
}
function imageBytes(dataUrl){const parts=dataUrl.split(","),raw=atob(parts[1]||""),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes}
async function listWines(env){
 if(!dbReady(env))return json({error:"공용 DB가 아직 연결되지 않았습니다."},503);
 const r=await dbFetch(env,"/rest/v1/wines?select=id,data,image_url,created_at&order=created_at.desc");
 if(!r.ok)return json({error:"공용 보관함을 읽지 못했습니다: "+(await r.text()).slice(0,180)},502);
 const rows=await r.json();return json({wines:rows.map(row=>({...row.data,id:row.id,image:row.image_url}))});
}
async function saveWine(request,env){
 if(!allowed(request.headers.get("x-upload-code"),env))return json({error:"업로드 권한이 없습니다."},401);
 if(!dbReady(env))return json({error:"공용 DB가 아직 연결되지 않았습니다."},503);
 const body=await request.json(),wine=body.wine;if(!wine?.id||!wine?.name)return json({error:"저장할 와인 정보가 올바르지 않습니다."},400);
 const id=String(wine.id).replace(/[^a-zA-Z0-9_-]/g,"-"),data={...wine,id};let imageUrl=data.image||"";
 if(imageUrl.startsWith("data:image/")){
  const path="/storage/v1/object/wine-images/"+encodeURIComponent(id)+".jpg",upload=await dbFetch(env,path,{method:"POST",headers:{"content-type":"image/jpeg","x-upsert":"true"},body:imageBytes(imageUrl)});
  if(!upload.ok)return json({error:"사진 저장에 실패했습니다: "+(await upload.text()).slice(0,180)},502);
  imageUrl=env.SUPABASE_URL.replace(/\\/$/,"")+"/storage/v1/object/public/wine-images/"+encodeURIComponent(id)+".jpg";
 }
 delete data.image;
 const r=await dbFetch(env,"/rest/v1/wines?on_conflict=id",{method:"POST",headers:{"content-type":"application/json","prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify({id,data,image_url:imageUrl})});
 if(!r.ok)return json({error:"와인 정보 저장에 실패했습니다: "+(await r.text()).slice(0,180)},502);
 return json({wine:{...data,image:imageUrl}});
}
async function deleteWine(request,env,id){
 if(!allowed(request.headers.get("x-upload-code"),env))return json({error:"삭제 권한이 없습니다."},401);
 if(!dbReady(env))return json({error:"공용 DB가 아직 연결되지 않았습니다."},503);
 const safe=String(id).replace(/[^a-zA-Z0-9_-]/g,"-"),r=await dbFetch(env,"/rest/v1/wines?id=eq."+encodeURIComponent(safe),{method:"DELETE"});
 if(!r.ok)return json({error:"기록 삭제에 실패했습니다."},502);
 await dbFetch(env,"/storage/v1/object/wine-images/"+encodeURIComponent(safe)+".jpg",{method:"DELETE"});
 return json({ok:true});
}
async function analyze(request,env){
 if(!allowed(request.headers.get("x-upload-code"),env))return json({error:"업로드 권한이 없습니다."},401);
 if(!env.OPENAI_API_KEY)return json({error:"OpenAI API 키가 아직 연결되지 않았습니다."},503);
 const body=await request.json();if(!body.image?.startsWith("data:image/"))return json({error:"이미지가 필요합니다."},400);if(body.image.length>16000000)return json({error:"12MB 이하 사진을 사용하세요."},413);
 const prompt="사진의 와인 라벨과 주변 음식을 분석하고 웹 검색으로 검증하라. 와인명, 와이너리, 빈티지, 국가, 지역, 아펠라시옹·떼루아, 품종, 유형을 식별한다. Vivino 평점·링크, Wine Spectator 점수, 공식 와이너리 페이지, 도수는 실제로 확인될 때만 기록하고 모르면 빈 문자열로 둔다. 추천 페어링과 사진에서 실제로 함께 먹은 음식은 구분한다. 사용자 코멘트의 공통 경향과 재미있는 정보도 한국어로 간결하게 쓴다. summary, crowd, funFact, pairing, foodNote에는 URL이나 Markdown 링크를 넣지 말고 검증한 링크는 sources와 전용 URL 필드에만 넣는다. 모든 URL에서 utm_source 등 추적 매개변수를 제거한다. 가격, 구매처, 개인 점수는 사진에서 명확하지 않으면 빈 문자열이다. 메타데이터 참고값: "+JSON.stringify(body.metadata||{})+". 촬영일과 GPS는 해당 참고값을 그대로 사용하며 추측하지 않는다. type은 레드, 화이트, 로제, 스파클링, 주정강화, 기타 중 하나, status는 확인됨, 부분 확인, 확인 필요 중 하나다.";
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+env.OPENAI_API_KEY},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5.6-luna",tools:[{type:"web_search"}],input:[{role:"user",content:[{type:"input_text",text:prompt},{type:"input_image",image_url:body.image,detail:"high"}]}],text:{format:{type:"json_schema",name:"wine_record",strict:true,schema}}})});
 if(!r.ok){const status=r.status===429?429:502;return json({error:"AI 분석 오류: "+(await r.text()).slice(0,240)},status)}const out=await r.json(),text=out.output_text||out.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;if(!text)return json({error:"분석 결과가 없습니다."},502);try{const searches=(out.output||[]).filter(x=>x.type==="web_search_call").length,input=out.usage?.input_tokens||0,output=out.usage?.output_tokens||0;return json({wine:JSON.parse(text),usage:{inputTokens:input,outputTokens:output,webSearchCalls:searches,estimatedUsd:input/1000000+output*6/1000000+searches*.01}})}catch{return json({error:"분석 결과 형식을 읽지 못했습니다."},502)}
}
export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname==="/api/auth"&&request.method==="POST"){const b=await request.json();return allowed(b.code,env)?json({ok:true}):json({ok:false},401)}if(u.pathname==="/api/analyze"&&request.method==="POST")return analyze(request,env);if(u.pathname==="/api/wines"&&request.method==="GET")return listWines(env);if(u.pathname==="/api/wines"&&request.method==="POST")return saveWine(request,env);if(u.pathname.startsWith("/api/wines/")&&request.method==="DELETE")return deleteWine(request,env,decodeURIComponent(u.pathname.slice(11)));return new Response(html,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"public, max-age=60"}})}};`);
