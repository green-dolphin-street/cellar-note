"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const seedWines = [
  {
    id: "mucho-mas",
    image: "/sample1.jpg",
    name: "Mucho Más Tinto",
    winery: "Félix Solís Avantis",
    vintage: "NV",
    country: "스페인",
    region: "Vino de España",
    grapes: ["Tempranillo", "Garnacha", "Syrah"],
    type: "레드",
    confidence: 96,
    status: "확인됨",
    summary: "잘 익은 검은 과실과 바닐라, 은은한 가죽·카카오가 겹치는 부드럽고 풍성한 스페인 레드 블렌드.",
    crowd: "대체로 ‘가격 대비 과실 풍미가 진하고 편하게 마시기 좋다’는 반응이 많습니다. 오크와 바닐라가 분명해 달큰하게 느낀다는 의견도 있습니다.",
    funFact: "이름 Mucho Más는 스페인어로 ‘훨씬 더’라는 뜻. 여러 스페인 산지의 오래된 포도나무를 블렌딩합니다.",
    pairing: "타파스 · 숙성 치즈 · 붉은 고기 · 초콜릿 디저트",
    sources: [
      { label: "생산자", url: "https://www.felixsolis.com/wine/mucho-mas/mucho-mas/" },
      { label: "커뮤니티", url: "https://www.vivino.com/en/felix-solis-mucho-mas-tinto/w/6266660?year=N.V" }
    ],
    color: "#8f223d"
  },
  {
    id: "taka",
    image: "/sample2.jpg",
    name: "TAKĀ Sauvignon Blanc",
    winery: "TAKĀ",
    vintage: "2025",
    country: "뉴질랜드",
    region: "Marlborough",
    grapes: ["Sauvignon Blanc"],
    type: "화이트",
    confidence: 91,
    status: "부분 확인",
    summary: "라벨에서 말보로 소비뇽 블랑과 2025 빈티지가 선명하게 확인됩니다. 생산자 상세와 테이스팅 정보는 추가 검증이 필요합니다.",
    crowd: "동일 병의 신뢰할 만한 다수 리뷰를 아직 확보하지 못했습니다. 일반적인 말보로 소비뇽 블랑의 인상과 혼동하지 않도록 보류했습니다.",
    funFact: "Marlborough는 뉴질랜드 소비뇽 블랑으로 세계적인 명성을 얻은 산지입니다. 다만 이것은 산지 정보이며 이 병의 개별 평가가 아닙니다.",
    pairing: "굴 · 흰살생선 · 허브 샐러드 · 염소 치즈",
    sources: [],
    color: "#9da04f"
  },
  {
    id: "red-deer",
    image: "/sample3.jpg",
    name: "Red Deer Station 30 Shiraz",
    winery: "Red Deer Station",
    vintage: "2019",
    country: "호주",
    region: "Langhorne Creek",
    grapes: ["Shiraz"],
    type: "레드",
    confidence: 94,
    status: "확인됨",
    summary: "짙은 과실과 따뜻한 질감, 매끈한 피니시가 중심인 랭혼 크릭 쉬라즈.",
    crowd: "공식 소개는 풍부하고 구조감 있는 스타일을 강조합니다. 독립적인 사용자 코멘트가 충분하지 않아 ‘사람들의 평가’로 단정하지 않았습니다.",
    funFact: "숫자 30은 Red Deer Station의 산지별·스타일별 라인업을 구분하는 이름으로 쓰입니다.",
    pairing: "양갈비 · 바비큐 · 불고기 · 단단한 치즈",
    sources: [
      { label: "생산자", url: "https://reddeerstation.com.au/" }
    ],
    color: "#6e2434"
  }
];

export default function Home() {
  const [wines, setWines] = useState(seedWines);
  const [selected, setSelected] = useState(seedWines[0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("cellar-note-wines");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setWines(parsed);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cellar-note-wines", JSON.stringify(wines));
  }, [wines]);

  const filtered = useMemo(() => wines.filter((wine) => {
    const inFilter = filter === "전체" || wine.type === filter;
    const text = `${wine.name} ${wine.winery} ${wine.country} ${wine.region}`.toLowerCase();
    return inFilter && text.includes(query.toLowerCase());
  }), [wines, filter, query]);

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("이미지 파일만 올려주세요.");
      return;
    }
    setUploading(true);
    setNotice("");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);

    const form = new FormData();
    form.append("image", file);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "분석에 실패했습니다.");
      const wine = { ...data.wine, id: `${Date.now()}`, image: dataUrl, color: "#7f2f45" };
      setWines((current) => [wine, ...current]);
      setSelected(wine);
      setNotice(data.demo ? "현재 데모 분석입니다. OPENAI_API_KEY를 연결하면 실제 라벨을 분석합니다." : "AI 분석이 완료됐습니다. 저장 전에 내용을 확인해 주세요.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setUploading(false);
    }
  }

  function deleteWine(id) {
    const next = wines.filter((wine) => wine.id !== id);
    setWines(next);
    setSelected(next[0] || null);
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brandMark">C</span><span>Cellar Note <i>AI</i></span></a>
        <button className="avatar" aria-label="프로필">MY</button>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">YOUR PRIVATE WINE MEMORY</span>
          <h1>마신 와인은 잊혀져도,<br/><em>취향은 남도록.</em></h1>
          <p>라벨 사진 한 장이면 산지부터 품종, 사람들의 코멘트까지.<br/>AI가 정리하고 당신은 그 순간만 기억하세요.</p>
          <button className="primary" onClick={() => fileRef.current?.click()}>
            <span>＋</span> 새 와인 기록하기
          </button>
          <input ref={fileRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])}/>
          <div className="stats"><b>{wines.length}</b><span>기록한 와인</span><b>{new Set(wines.map(w => w.country)).size}</b><span>여행한 산지</span></div>
        </div>
        <div className="heroVisual">
          <div className="stamp">AI<br/><span>LABEL<br/>SCAN</span></div>
          <img src="/sample1.jpg" alt="Mucho Más wine bottle"/>
          <div className="scanline"/>
          <div className="floatCard"><span>96% MATCH</span><b>Mucho Más</b><small>Félix Solís · Spain</small></div>
        </div>
      </section>

      <section className="library">
        <div className="sectionHead">
          <div><span className="eyebrow">MY COLLECTION</span><h2>나의 와인 셀러</h2></div>
          <label className="search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="와인명, 산지 검색"/></label>
        </div>
        <div className="filters">
          {["전체", "레드", "화이트", "스파클링"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className="grid">
          {filtered.map((wine, index) => (
            <button className="wineCard" key={wine.id} onClick={() => setSelected(wine)}>
              <div className="photo"><img src={wine.image} alt={wine.name}/><span>{String(index + 1).padStart(2, "0")}</span><i>{wine.status}</i></div>
              <div className="cardBody">
                <small>{wine.country} · {wine.region}</small>
                <h3>{wine.name}</h3>
                <p>{wine.winery} {wine.vintage && `· ${wine.vintage}`}</p>
                <div className="tags">{wine.grapes?.slice(0, 2).map(g => <span key={g}>{g}</span>)}</div>
              </div>
            </button>
          ))}
          <button className="addCard" onClick={() => fileRef.current?.click()}><span>＋</span><b>새로운 병을 열었나요?</b><small>사진으로 기록 추가</small></button>
        </div>
      </section>

      {selected && <section className="detail">
        <button className="close" onClick={() => setSelected(null)}>×</button>
        <div className="detailImage"><img src={selected.image} alt={selected.name}/><span style={{background:selected.color}}>{selected.confidence}%<small>AI 신뢰도</small></span></div>
        <div className="detailBody">
          <div className="detailMeta">{selected.country} / {selected.region} <i>{selected.status}</i></div>
          <h2>{selected.name}</h2>
          <p className="producer">{selected.winery} · {selected.vintage}</p>
          <div className="facts">
            <div><small>TYPE</small><b>{selected.type}</b></div>
            <div><small>GRAPE</small><b>{selected.grapes?.join(", ")}</b></div>
            <div><small>REGION</small><b>{selected.region}</b></div>
          </div>
          <article><span>01</span><div><h4>한 잔 요약</h4><p>{selected.summary}</p></div></article>
          <article><span>02</span><div><h4>사람들은 이렇게 말해요</h4><p>{selected.crowd}</p></div></article>
          <article><span>03</span><div><h4>알아두면 재밌는 이야기</h4><p>{selected.funFact}</p></div></article>
          <article><span>04</span><div><h4>같이 먹기 좋은 것</h4><p>{selected.pairing}</p></div></article>
          {selected.sources?.length > 0 && <div className="sources">근거 {selected.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>)}</div>}
          <div className="actions"><button onClick={() => {navigator.clipboard?.writeText(`${selected.name} — ${selected.summary}`); setNotice("요약을 복사했습니다.");}}>요약 복사</button><button className="danger" onClick={() => deleteWine(selected.id)}>기록 삭제</button></div>
        </div>
      </section>}

      <section className="uploadStrip">
        <div><span className="eyebrow">SNAP. SCAN. REMEMBER.</span><h2>사진 한 장이면 충분해요.</h2><p>휴대폰 카메라로 라벨을 찍거나 앨범에서 선택하세요.</p></div>
        <button className="primary light" onClick={() => fileRef.current?.click()}>{uploading ? "분석 중…" : "카메라 열기 →"}</button>
      </section>

      {preview && uploading && <div className="loading"><img src={preview} alt="분석 중"/><div><b>라벨을 읽고 있어요</b><span>와이너리 · 지역 · 품종 찾는 중</span></div></div>}
      {notice && <button className="toast" onClick={() => setNotice("")}>{notice}<span>×</span></button>}
      <footer>Cellar Note AI <span>사진에서 시작되는 와인 다이어리</span><small>AI 정보는 틀릴 수 있으니 라벨과 출처를 확인하세요.</small></footer>
    </main>
  );
}
