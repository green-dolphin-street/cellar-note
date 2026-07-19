import { useEffect, useMemo, useRef, useState } from "react";
import * as exifr from "exifr";

const seedWines = [
  {id:"mucho-mas",image:"/sample1.jpg",name:"Mucho Más Tinto",winery:"Félix Solís Avantis",vintage:"NV",country:"스페인",region:"Vino de España",appellation:"",grapes:["Tempranillo","Garnacha","Syrah"],type:"레드",confidence:96,status:"확인됨",summary:"검은 과실과 바닐라가 겹치는 부드러운 스페인 레드 블렌드.",crowd:"과실 풍미가 진하고 편하게 마시기 좋다는 반응이 많습니다.",funFact:"Mucho Más는 스페인어로 ‘훨씬 더’라는 뜻입니다.",pairing:"타파스 · 숙성 치즈 · 붉은 고기",consumedFoods:["초콜릿·견과류 디저트"],foodNote:"사진에서 디저트가 함께 보입니다.",foodConfidence:88,consumedDate:"",location:"",vivinoRating:"",vivinoUrl:"https://www.vivino.com/en/felix-solis-mucho-mas-tinto/w/6266660",wsScore:"",officialUrl:"https://www.felixsolis.com/wine/mucho-mas/mucho-mas/",priceKrw:"",purchasedAt:"",alcohol:"",personalRating:"",sources:[]},
  {id:"taka",image:"/sample2.jpg",name:"TAKĀ Sauvignon Blanc",winery:"TAKĀ",vintage:"2025",country:"뉴질랜드",region:"Marlborough",appellation:"",grapes:["Sauvignon Blanc"],type:"화이트",confidence:91,status:"부분 확인",summary:"선명한 산도와 허브·열대과실 인상이 기대되는 말보로 소비뇽 블랑.",crowd:"동일 병의 충분한 리뷰는 아직 확인하지 못했습니다.",funFact:"Marlborough는 뉴질랜드 소비뇽 블랑의 대표 산지입니다.",pairing:"굴 · 흰살생선 · 허브 샐러드",consumedFoods:["한식 요리"],foodNote:"음식 일부만 보여 정확한 메뉴 확인이 필요합니다.",foodConfidence:42,consumedDate:"",location:"",vivinoRating:"",vivinoUrl:"",wsScore:"",officialUrl:"",priceKrw:"",purchasedAt:"",alcohol:"",personalRating:"",sources:[]},
  {id:"red-deer",image:"/sample3.jpg",name:"Red Deer Station 30 Shiraz",winery:"Red Deer Station",vintage:"2019",country:"호주",region:"Langhorne Creek",appellation:"",grapes:["Shiraz"],type:"레드",confidence:94,status:"확인됨",summary:"짙은 과실과 따뜻한 질감, 매끈한 피니시가 중심인 쉬라즈.",crowd:"공식 소개는 풍부하고 구조감 있는 스타일을 강조합니다.",funFact:"숫자 30은 산지·스타일별 라인업을 구분하는 이름입니다.",pairing:"양갈비 · 바비큐 · 불고기",consumedFoods:["매운 한식 요리"],foodNote:"붉은 양념 음식이 보입니다.",foodConfidence:63,consumedDate:"",location:"",vivinoRating:"",vivinoUrl:"",wsScore:"",officialUrl:"https://reddeerstation.com.au/",priceKrw:"",purchasedAt:"",alcohol:"",personalRating:"",sources:[]}
];
const knownDetails = {
  "mucho-mas": {appellation:"Vino de España · 스페인 여러 산지 블렌드",vivinoRating:"4.1",vivinoUrl:"https://www.vivino.com/en/felix-solis-mucho-mas-tinto/w/6266660",officialUrl:"https://www.felixsolis.com/wine/mucho-mas/mucho-mas-tinto/",alcohol:"13.5%"},
  taka: {appellation:"Marlborough",vivinoRating:"4.5",vivinoUrl:"https://www.vivino.com/en/taka-marlborough-sauvignon-blanc/w/3001081",officialUrl:"https://www.takawinenz.com/",alcohol:"13%",crowd:"열대과실·시트러스·구스베리와 산뜻한 산도가 반복해서 언급됩니다.",funFact:"TAKĀ는 마오리어로 낚싯바늘과 줄을 잇는 실을 뜻합니다."},
  "red-deer": {appellation:"Langhorne Creek GI · South Australia",vivinoRating:"4.0",vivinoUrl:"https://www.vivino.com/en/red-deer-station-thirty-shiraz/w/10462802",officialUrl:"https://reddeerstation.com.au/#wines",alcohol:"14%",funFact:"숫자 30은 Langhorne Creek 산지의 라인업을 구분하는 이름입니다."}
};
seedWines.forEach(wine => Object.assign(wine, knownDetails[wine.id] || {}));
const types=["전체","레드","화이트","로제","스파클링","주정강화","기타"];
const blank="—";

export default function App(){
  const [wines,setWines]=useState(seedWines),[selected,setSelected]=useState(null);
  const [query,setQuery]=useState(""),[type,setType]=useState("전체"),[country,setCountry]=useState("전체"),[region,setRegion]=useState("전체"),[grape,setGrape]=useState("전체");
  const [notice,setNotice]=useState(""),[preview,setPreview]=useState(""),[account,setAccount]=useState(false),[uploading,setUploading]=useState(false),[code,setCode]=useState("");
  const [syncing,setSyncing]=useState(false),[serverReady,setServerReady]=useState(false),[hydrated,setHydrated]=useState(false),[trash,setTrash]=useState([]);
  const cameraRef=useRef(), albumRef=useRef(), busyRef=useRef(false), migrationRef=useRef(false);
  useEffect(()=>{(async()=>{let local=[];try{const raw=localStorage.getItem("cellar-note-wines")||"[]";local=JSON.parse(raw);if(!localStorage.getItem("cellar-note-legacy-wines"))localStorage.setItem("cellar-note-legacy-wines",raw)}catch{}try{const response=await fetch("/api/wines"),data=await response.json();if(!response.ok)throw Error(data.error);setWines(data.wines?.length?data.wines:(local.length?local:seedWines));setServerReady(true)}catch{if(local.length)setWines(local)}finally{setHydrated(true)}})()},[]);
  useEffect(()=>{if(hydrated)localStorage.setItem("cellar-note-wines",JSON.stringify(wines))},[wines,hydrated]);
  const values=(key)=>["전체",...new Set(wines.flatMap(w=>key==="grapes"?(w.grapes||[]):[w[key]]).filter(Boolean))];
  const countries=values("country"), regions=["전체",...new Set(wines.filter(w=>country==="전체"||w.country===country).map(w=>w.region).filter(Boolean))], grapes=values("grapes");
  const filtered=useMemo(()=>wines.filter(w=>(type==="전체"||w.type===type)&&(country==="전체"||w.country===country)&&(region==="전체"||w.region===region)&&(grape==="전체"||w.grapes?.includes(grape))&&`${w.name} ${w.winery} ${w.country} ${w.region} ${w.grapes?.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[wines,type,country,region,grape,query]);
  const unlocked=()=>!!sessionStorage.getItem("cellar-note-upload-code");
  const choose=(ref)=>{if(!unlocked()){setAccount(true);setNotice("사진 분석은 MY에서 먼저 로그인해 주세요.");return}ref.current?.click()};
  async function loadSharedWines(){const response=await fetch("/api/wines"),data=await response.json();if(!response.ok)throw Error(data.error||"공용 보관함을 불러오지 못했습니다.");setWines(data.wines||[]);setServerReady(true)}
  async function saveSharedWine(wine,access){const response=await fetch("/api/wines",{method:"POST",headers:{"content-type":"application/json","x-upload-code":access},body:JSON.stringify({wine})}),data=await response.json();if(!response.ok)throw Error(data.error||"공용 보관함에 저장하지 못했습니다.");return data.wine}
  async function syncThisDevice(){
    if(!unlocked())return;
    setSyncing(true);setNotice("");
    try{
      const access=sessionStorage.getItem("cellar-note-upload-code")||"",legacy=JSON.parse(localStorage.getItem("cellar-note-legacy-wines")||"[]"),current=JSON.parse(localStorage.getItem("cellar-note-wines")||"[]"),local=[...new Map([...legacy,...current].map(wine=>[wine.id,wine])).values()];
      for(const wine of local)await saveSharedWine(wine,access);
      await loadSharedWines();localStorage.setItem("cellar-note-migrated-v1","yes");setNotice(`${local.length}개의 이 기기 기록을 공용 보관함과 자동 동기화했습니다.`);
    }catch(error){setNotice(error.message)}finally{setSyncing(false)}
  }
  async function loadTrash(){const response=await fetch("/api/trash",{headers:{"x-upload-code":sessionStorage.getItem("cellar-note-upload-code")||""}}),data=await response.json();if(response.ok)setTrash(data.wines||[])}
  useEffect(()=>{if(account&&unlocked())loadTrash()},[account]);
  useEffect(()=>{if(hydrated&&unlocked()&&!migrationRef.current&&!localStorage.getItem("cellar-note-migrated-v1")){migrationRef.current=true;syncThisDevice()}},[hydrated]);
  async function restore(id){const response=await fetch(`/api/wines/${encodeURIComponent(id)}/restore`,{method:"POST",headers:{"x-upload-code":sessionStorage.getItem("cellar-note-upload-code")||""}}),data=await response.json();if(!response.ok){setNotice(data.error||"복원하지 못했습니다.");return}setTrash(items=>items.filter(item=>item.id!==id));await loadSharedWines();setNotice("와인 기록을 복원했습니다.")}
  async function login(e){e.preventDefault();const r=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});if(r.ok){sessionStorage.setItem("cellar-note-upload-code",code);setCode("");if(!localStorage.getItem("cellar-note-migrated-v1"))await syncThisDevice();else{await loadSharedWines();setNotice("사진 분석 로그인이 완료되었습니다.")}setAccount(false)}else setNotice("로그인 정보가 올바르지 않습니다.")}
  async function metadata(file){try{const x=await exifr.parse(file,{gps:true,exif:true,tiff:true});const d=x?.DateTimeOriginal||x?.CreateDate||new Date(file.lastModified);const date=d?new Date(d).toISOString().slice(0,10):"";const lat=x?.latitude,lon=x?.longitude;return{consumedDate:date,location:Number.isFinite(lat)?`${lat.toFixed(5)}, ${lon.toFixed(5)}`:"",gps:Number.isFinite(lat)?{latitude:lat,longitude:lon}:null}}catch{return{consumedDate:new Date(file.lastModified).toISOString().slice(0,10),location:"",gps:null}}}
  async function resizeImage(file){const bitmap=await createImageBitmap(file);const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL("image/jpeg",.9)}
  async function requestAnalysis(image,meta,access){let last;for(let attempt=0;attempt<3;attempt++){const r=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json","x-upload-code":access},body:JSON.stringify({image,metadata:meta})}),data=await r.json();if(r.ok)return data;if(r.status===401||r.status===400||r.status===413||r.status===402||r.status===429&&attempt===2)throw Error(data.error||"분석에 실패했습니다.");last=Error(data.error||"분석에 실패했습니다.");if(r.status!==429&&r.status<500)throw last;await new Promise(ok=>setTimeout(ok,attempt===0?1000:3000))}throw last}
  async function handleFile(file){if(!file||busyRef.current)return;busyRef.current=true;setUploading(true);setNotice("");try{const meta=await metadata(file),image=await resizeImage(file),access=sessionStorage.getItem("cellar-note-upload-code")||"";setPreview(image);const data=await requestAnalysis(image,meta,access),wine={...data.wine,...meta,id:String(Date.now()),image},savedWine=await saveSharedWine(wine,access);setWines(v=>[savedWine,...v.filter(item=>item.id!==savedWine.id)]);setSelected(savedWine);if(data.usage?.estimatedUsd){const month=new Date().toISOString().slice(0,7),saved=JSON.parse(localStorage.getItem("cellar-note-usage")||"{}");saved[month]=(saved[month]||0)+data.usage.estimatedUsd;localStorage.setItem("cellar-note-usage",JSON.stringify(saved))}setNotice("와인 분석과 공용 보관함 저장을 완료했습니다.")}catch(e){if(e.message.includes("권한")){sessionStorage.removeItem("cellar-note-upload-code");setAccount(true)}setNotice(e.message)}finally{busyRef.current=false;setUploading(false)}}
  const cleanUrl=(value)=>{
    if(!value)return "";
    try{
      const url=new URL(value);
      ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(key=>url.searchParams.delete(key));
      return url.toString();
    }catch{return value}
  };
  const RichText=({text})=>{
    const value=String(text||blank).replace(/\(\[([^\]]+)\]\((https?:\/\/[^)]+)\)\)/g,"[$1]($2)");
    const pattern=/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,parts=[];
    let cursor=0,match;
    while((match=pattern.exec(value))){
      if(match.index>cursor)parts.push(value.slice(cursor,match.index));
      parts.push(<a key={`${match.index}-${match[2]}`} href={cleanUrl(match[2])} target="_blank" rel="noreferrer">{match[1]} ↗</a>);
      cursor=pattern.lastIndex;
    }
    if(cursor<value.length)parts.push(value.slice(cursor));
    return <>{parts}</>;
  };
  const Field=({label,value,link})=><div className="field"><small>{label}</small>{link&&value?<a href={cleanUrl(link)} target="_blank" rel="noreferrer">{value} ↗</a>:<b>{value||blank}</b>}</div>;
  return <main>
    <header><a className="brand" href="#">Cellar Note</a><button className="my" onClick={()=>setAccount(true)}>MY</button></header>
    <section className="hero"><div><h1>와타시,<br/>이 와인들을 잊고싶지 않아...</h1><p>마신 병과 그날의 한 끼를 한곳에 기록합니다.</p><div className="uploadActions"><button onClick={()=>choose(cameraRef)}>사진 찍기</button><button className="quiet" onClick={()=>choose(albumRef)}>앨범에서 선택</button></div></div><img src="/dionysus-hero.png" alt="포도와 디오니소스 일러스트"/></section>
    <input hidden ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={e=>handleFile(e.target.files?.[0])}/><input hidden ref={albumRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={e=>handleFile(e.target.files?.[0])}/>
    <section className="collection"><div className="titleRow"><h2>나의 와인 <span>{wines.length}</span></h2><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름, 산지, 품종 검색"/></div>
      <div className="typeFilters">{types.map(x=><button className={type===x?"active":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div>
      <div className="selectFilters"><label>국가<select value={country} onChange={e=>{setCountry(e.target.value);setRegion("전체")}}>{countries.map(x=><option key={x}>{x}</option>)}</select></label><label>지역·떼루아<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(x=><option key={x}>{x}</option>)}</select></label><label>품종<select value={grape} onChange={e=>setGrape(e.target.value)}>{grapes.map(x=><option key={x}>{x}</option>)}</select></label></div>
      <div className="grid">{filtered.map(w=><button className="card" key={w.id} onClick={()=>setSelected(w)}><img src={w.image}/><div><small>{w.country} · {w.region}</small><h3>{w.name}</h3><p>{w.winery} {w.vintage&&`· ${w.vintage}`}</p></div></button>)}<button className="add" onClick={()=>choose(albumRef)}>＋<span>기록 추가</span></button></div>
    </section>
    {selected&&<div className="overlay" onClick={()=>setSelected(null)}><section className="detail" onClick={e=>e.stopPropagation()}><button className="x" onClick={()=>setSelected(null)}>×</button><img className="detailPhoto" src={selected.image}/><div className="detailBody"><small>{selected.country} / {selected.region}</small><h2>{selected.name}</h2><p>{selected.winery} · {selected.vintage||blank}</p><div className="fields"><Field label="품종" value={selected.grapes?.join(", ")}/><Field label="아펠라시옹·떼루아" value={selected.appellation}/><Field label="마신 날짜" value={selected.consumedDate}/><Field label="장소·GPS" value={selected.location}/><Field label="가격 (KRW)" value={selected.priceKrw}/><Field label="구매처" value={selected.purchasedAt}/><Field label="Vivino" value={selected.vivinoRating} link={selected.vivinoUrl}/><Field label="Wine Spectator" value={selected.wsScore}/><Field label="도수" value={selected.alcohol}/><Field label="내 점수" value={selected.personalRating}/><Field label="공식 페이지" value={selected.officialUrl?"열기":""} link={selected.officialUrl}/></div>
      {[["한 잔 요약",selected.summary],["사람들의 코멘트",selected.crowd],["재미있는 정보",selected.funFact],["추천 페어링",selected.pairing],["그날 함께 먹은 음식",selected.consumedFoods?.join(" · ")||"확인되지 않음"]].map(([a,b])=><article key={a}><h4>{a}</h4><p><RichText text={b}/></p></article>)}
      {selected.sources?.length>0&&<div className="sourceLinks"><small>참고한 페이지</small>{selected.sources.map((source,index)=><a key={`${source.url}-${index}`} href={cleanUrl(source.url)} target="_blank" rel="noreferrer">{source.label||source.title||`출처 ${index+1}`} ↗</a>)}</div>}
      {unlocked()&&<button className="delete" onClick={async()=>{try{const response=await fetch(`/api/wines/${encodeURIComponent(selected.id)}`,{method:"DELETE",headers:{"x-upload-code":sessionStorage.getItem("cellar-note-upload-code")||""}}),data=await response.json();if(!response.ok)throw Error(data.error);setWines(v=>v.filter(w=>w.id!==selected.id));setSelected(null);setNotice("공용 보관함에서 기록을 삭제했습니다.")}catch(error){setNotice(error.message||"기록을 삭제하지 못했습니다.")}}}>기록 삭제</button>}</div></section></div>}
    {account&&<div className="overlay"><form className="account" onSubmit={login}><button type="button" className="x" onClick={()=>setAccount(false)}>×</button><h2>MY</h2><p>공개 열람은 누구나 가능하고 사진 분석과 기록 변경만 로그인이 필요합니다.</p>{unlocked()?<><b>{syncing?"기존 기록 자동 동기화 중…":serverReady?"공용 보관함 연결됨":"이 기기의 임시 기록을 표시 중"}</b><small>새 등록과 삭제는 모든 기기에 즉시 반영됩니다.</small><small>이번 달 이 브라우저의 예상 사용액: ${(JSON.parse(localStorage.getItem("cellar-note-usage")||"{}")[new Date().toISOString().slice(0,7)]||0).toFixed(3)}</small>{trash.length>0&&<div className="trash"><b>최근 삭제</b>{trash.map(item=><div key={item.id}><span>{item.name}<small>{Math.max(0,15-Math.floor((Date.now()-new Date(item.deletedAt))/86400000))}일 안에 복원 가능</small></span><button type="button" onClick={()=>restore(item.id)}>복원</button></div>)}</div>}<button type="button" className="quiet" onClick={()=>{sessionStorage.removeItem("cellar-note-upload-code");setAccount(false)}}>로그아웃</button></>:<><label>관리자 로그인<input type="password" value={code} onChange={e=>setCode(e.target.value)} required/></label><button>로그인</button></>}</form></div>}
    {uploading&&<div className="loading"><img src={preview} alt="분석 중"/><b>사진을 줄이고 와인을 분석하고 있어요…</b></div>}
    {notice&&<button className="toast" onClick={()=>setNotice("")}>{notice} ×</button>}
    <footer>Cellar Note <span>AI 결과는 틀릴 수 있으니 라벨과 출처를 확인하세요.</span></footer>
  </main>
}
