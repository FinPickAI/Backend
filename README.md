# FinPick — 나만의 금융 큐레이션 서비스

FinPick은 사용자의 나이, 직업, 소득, 저축 목표, 투자성향을 바탕으로 예금·적금 상품과 정부지원금을 추천하는 개인 맞춤형 금융 큐레이션 서비스입니다.

단순히 최고 금리 상품을 나열하는 것이 아니라, 실제 금융감독원 데이터를 분석해 도출한 인사이트(가입기간별 금리 분포, 은행 유형별 금리 격차, 단리/복리 차이 등)를 추천 로직에 직접 반영합니다.

- **Frontend**: [finpick-frontend](https://github.com/FinPickAI/Frontend)
- **Live Demo**: https://frontend-bngx.vercel.app

---

## Backend

### 개요

금융감독원 금융상품통합비교공시 오픈API에서 실제 예금·적금 상품 데이터를 수집해 PostgreSQL에 저장하고, SQL 분석으로 도출한 인사이트 기반의 스코어링 로직으로 사용자 맞춤 추천을 제공하는 REST API 서버입니다.

### 기술 스택

- Node.js, Express
- PostgreSQL (Render 호스팅)
- 금융감독원 금융상품통합비교공시 Open API

### 아키텍처

```
FSS Open API → seed.js (수집·적재) → PostgreSQL (products, product_options)
                                              ↓
                                    server.js (SQL 조회 + 스코어링)
                                              ↓
                                       /recommend API
```

### 데이터 분석 → 추천 로직 설계

`scripts/analysis.js`에서 실행한 5가지 SQL 분석 결과를 스코어링 로직에 반영했습니다.

| 분석 결과 | 반영 내용 |
|---|---|
| 적금 평균금리(3.64%)가 예금(2.85%)보다 높음 | 공격형 투자성향 유저에게 적금 가점 확대 |
| 12개월 만기 구간 평균금리가 가장 높음 | 12개월 근접 가입기간에 보너스 점수 부여 |
| 인터넷은행(케이뱅크·카카오뱅크·토스뱅크)이 평균금리 상위 | 인터넷은행 상품에 가점 |
| 복리가 단리보다 평균 0.6%p 높음 (전체의 4.6%만 해당) | 복리 상품에 희소성 가점 |
| 최고금리 상품 대부분이 타겟 조건(우대조건) 보유 | 유저 직업군과 우대조건 텍스트 매칭 시 가점 |

### 폴더 구조

```
finpick-backend/
├── server.js          # Express 서버, /recommend API
├── db.js              # PostgreSQL 커넥션 풀
├── fssApi.js          # 금융감독원 API 연동
├── schema.sql          # 테이블 정의 (products, product_options)
├── initDb.js           # 테이블 생성 스크립트
├── seed.js             # API 데이터 수집 → DB 적재
├── scripts/
│   └── analysis.js     # SQL 분석 (스코어링 로직 설계 근거)
└── .env.example         # 필요 환경변수 템플릿
```

### 실행 방법

```bash
npm install
cp .env.example .env   # FSS_API_KEY, DATABASE_URL 입력
npm run initdb          # 테이블 생성
npm run seed             # 실데이터 수집·적재
npm start                # 서버 실행 (localhost:3001)
```

### 환경변수

| 변수 | 설명 |
|---|---|
| `FSS_API_KEY` | 금융감독원 오픈API 인증키 |
| `DATABASE_URL` | PostgreSQL 커넥션 스트링 |
| `PORT` | 서버 포트 (기본 3001) |

### API

**POST `/recommend`**

```json
// Request
{
  "age": 26,
  "job": "사회초년생",
  "period": 12,
  "investmentPropensity": "공격",
  "monthlyIncome": 250,
  "monthlySavings": 50
}
```

```json
// Response
{
  "products": [
    { "bankName": "농협은행주식회사", "productName": "NH1934월복리적금", "score": 130.4 }
  ],
  "benefits": [
    { "name": "청년월세 특별지원", "description": "..." }
  ],
  "actionRecommendation": "..."
}
```
