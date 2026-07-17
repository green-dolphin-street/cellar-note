# Cellar Note AI

와인 라벨 사진을 업로드하면 와이너리, 와인명, 빈티지, 산지, 품종과 테이스팅 정보를 정리하는 모바일 우선 웹 앱입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`을 엽니다. 실제 AI 분석에는 서버 환경 변수 `OPENAI_API_KEY`가 필요합니다. 선택적으로 `OPENAI_MODEL`을 지정할 수 있습니다.

공개 열람은 누구나 가능하지만 AI 업로드는 서버 환경 변수 `UPLOAD_ACCESS_CODE`로 보호합니다. 사진 속 음식은 추천 페어링과 분리해 `consumedFoods`, `foodNote`, `foodConfidence`로 기록합니다. 브라우저에 추가한 기록은 현재 `localStorage`에 저장되므로 같은 기기·브라우저에서만 유지됩니다.

## 다음 단계

- 서버 데이터베이스로 기기 간 동기화
- 검색 API를 통한 사용자 평가 및 공식 정보 수집
- 로그인과 개인 셀러
- AI 분석 후 사용자 확인/수정 워크플로
