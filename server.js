const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const products = [
  { id: "p1", bankName: "국민은행", productName: "KB청년도약계좌", interestRate: 6.0, type: "savings", period: 36, targetJob: ["사회초년생", "학생", "구직자"], description: "청년의 중장기 자산형성을 지원하는 정부 연계형 적금 상품입니다.", notice: "중도 해지 시 정부 기여금이 지급되지 않을 수 있습니다.", tags: ["청년전용", "고금리", "정부지원"] },
  { id: "p2", bankName: "신한은행", productName: "신한 안심 정기예금", interestRate: 3.5, type: "deposit", period: 12, description: "안정적인 자산 관리를 원하는 분들을 위한 대표 예금 상품입니다.", notice: "만기 전 해지 시 약정 이율보다 낮은 중도해지 이율이 적용됩니다.", tags: ["안정형", "대표상품"] },
  { id: "p3", bankName: "카카오뱅크", productName: "26주 적금", interestRate: 4.0, type: "savings", period: 6, description: "매주 조금씩 늘려가는 재미가 있는 단기 집중 저축 상품입니다.", notice: "자동이체 실패 시 우대금리가 적용되지 않습니다.", tags: ["재미", "단기목목"] },
  { id: "p4", bankName: "하나은행", productName: "내맘적금", interestRate: 3.8, type: "savings", period: 12, description: "자유로운 입금으로 목돈을 마련할 수 있는 유연한 적금입니다.", notice: "최종 이율은 우대 조건 충족 여부에 따라 달라집니다.", tags: ["유연함", "목돈마련"] },
  { id: "p5", bankName: "토스뱅크", productName: "먼저 이자 받는 예금", interestRate: 3.2, type: "deposit", period: 6, description: "가입 즉시 이자를 먼저 받아 바로 활용할 수 있는 예금입니다.", notice: "중도 해지 시 이미 받은 이자는 원금에서 차감됩니다.", tags: ["선이자", "자산운용"] },
  { id: "p6", bankName: "우리은행", productName: "우리 첫거래 우대 적금", interestRate: 5.5, type: "savings", period: 12, targetJob: ["사회초년생", "직장인"], description: "우리은행과 처음 시작하는 고객을 위한 고금리 혜택 적금입니다.", notice: "직전 1년간 우리은행 계좌 보유 이력이 없어야 합니다.", tags: ["첫거래", "사회초년생추천"] },
  { id: "p7", bankName: "기업은행", productName: "IBK 중기근로자 우대적금", interestRate: 4.5, type: "savings", period: 24, targetJob: ["직장인"], description: "중소기업 근로자의 자산 형성을 위해 특별 우대 금리를 제공합니다.", notice: "재직 증명서 등 서류 확인이 필요할 수 있습니다.", tags: ["직장인 전용", "우대금리"] },
];

const benefits = [
  { id: "b1", name: "청년월세 특별지원", description: "경제적 어려움을 겪는 청년층의 주거비 부담 경감을 위해 월세를 지원합니다.", minAge: 19, maxAge: 34, maxIncome: 30000000, category: "주거", relevanceReason: "주거비 절감을 통한 저축 여력 확보에 도움이 됩니다." },
  { id: "b2", name: "근로장려금", description: "일은 하지만 소득이 적어 생활이 어려운 근로자 가구에 장려금을 지급합니다.", maxIncome: 22000000, category: "소득지원", relevanceReason: "추가 자산 형성의 마중물이 될 수 있는 지원금입니다." },
  { id: "b3", name: "청년도약계좌 정부기여금", description: "매월 저축액의 일정 비율을 정부가 추가로 적립해 드립니다.", minAge: 19, maxAge: 34, maxIncome: 75000000, category: "금융", relevanceReason: "고금리 상품에 추가 지원금까지 더해져 자산 형성에 가장 효과적입니다." },
  { id: "b4", name: "내일채움공제", description: "중소기업 핵심인력의 장기재직 유도를 위해 목돈 마련을 지원합니다.", targetJob: ["직장인"], category: "금융", relevanceReason: "재직 중인 기업과 정부가 함께 저축액을 매칭해 드립니다." },
];

app.post("/recommend", (req, res) => {
  const { age, job, monthlyIncome, investmentPropensity, period } = req.body;
  const annualIncome = monthlyIncome * 12;

  const scored = products.map(p => {
    let score = 0;
    if (p.period === period) score += 50;
    else if (Math.abs(p.period - period) <= 12) score += 20;

    if (investmentPropensity === "안정") {
      score += p.type === "deposit" ? 30 : 10;
    } else if (investmentPropensity === "공격") {
      score += p.type === "savings" ? 30 : 0;
    } else {
      score += 20;
    }

    if (p.targetJob?.includes(job)) score += 40;
    score += p.interestRate * 2;

    return { ...p, score };
  }).sort((a, b) => b.score - a.score);

  const filteredBenefits = benefits.filter(b => {
    if (b.minAge && age < b.minAge) return false;
    if (b.maxAge && age > b.maxAge) return false;
    if (b.maxIncome && annualIncome > b.maxIncome) return false;
    if (b.targetJob && !b.targetJob.includes(job)) return false;
    return true;
  });

  const top = scored[0];
  const action = age <= 34
    ? `"${top.productName}" 가입을 먼저 검토해보세요.`
    : `안정적인 "${top.productName}" 상품을 추천드립니다.`;

  res.json({
    products: scored.slice(0, 3),
    benefits: filteredBenefits.slice(0, 3),
    actionRecommendation: action,
  });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(3001, () => console.log("✅ Server running on http://localhost:3001"));