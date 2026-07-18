require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const INTERNET_BANKS = ["케이뱅크", "카카오뱅크", "토스뱅크"];

const benefits = [
  { id: "b1", name: "청년월세 특별지원", description: "경제적 어려움을 겪는 청년층의 주거비 부담 경감을 위해 월세를 지원합니다.", minAge: 19, maxAge: 34, maxIncome: 30000000, category: "주거", relevanceReason: "주거비 절감을 통한 저축 여력 확보에 도움이 됩니다." },
  { id: "b2", name: "근로장려금", description: "일은 하지만 소득이 적어 생활이 어려운 근로자 가구에 장려금을 지급합니다.", maxIncome: 22000000, category: "소득지원", relevanceReason: "추가 자산 형성의 마중물이 될 수 있는 지원금입니다." },
  { id: "b3", name: "청년도약계좌 정부기여금", description: "매월 저축액의 일정 비율을 정부가 추가로 적립해 드립니다.", minAge: 19, maxAge: 34, maxIncome: 75000000, category: "금융", relevanceReason: "고금리 상품에 추가 지원금까지 더해져 자산 형성에 가장 효과적입니다." },
  { id: "b4", name: "내일채움공제", description: "중소기업 핵심인력의 장기재직 유도를 위해 목돈 마련을 지원합니다.", targetJob: ["직장인"], category: "금융", relevanceReason: "재직 중인 기업과 정부가 함께 저축액을 매칭해 드립니다." },
];

const JOB_KEYWORDS = {
  "사회초년생": ["사회초년생", "청년"],
  "학생": ["학생", "청년"],
  "구직자": ["구직자", "청년"],
  "직장인": ["직장인", "근로자"],
};

// 상품별 옵션 중, 유저 희망기간과 가장 가까운 옵션 하나 선택
function pickBestOption(options, userPeriod) {
  return options.reduce((best, o) => {
    const dist = Math.abs(Number(o.save_trm) - userPeriod);
    const bestDist = best ? Math.abs(Number(best.save_trm) - userPeriod) : Infinity;
    return dist < bestDist ? o : best;
  }, null);
}

function calculateScore(product, option, user) {
  let score = 0;
  const optPeriod = Number(option.save_trm);

  // 1. 기간 매칭 (유저 희망기간과의 거리 기반)
  const dist = Math.abs(optPeriod - user.period);
  if (dist === 0) score += 40;
  else if (dist <= 6) score += 25;
  else if (dist <= 12) score += 15;
  else score += 5;

  // 2. 12개월 스위트스팟 보너스 (분석 결과: 12개월 구간 평균금리 최고)
  if (optPeriod === 12) score += 10;

  // 3. 투자성향 매칭 (분석 결과: 적금 평균금리가 예금보다 높음 → 공격형 가중치 상향)
  if (user.investmentPropensity === "안정") {
    score += product.product_type === "deposit" ? 25 : 5;
  } else if (user.investmentPropensity === "공격") {
    score += product.product_type === "savings" ? 35 : 5;
  } else {
    score += 15;
  }

  // 4. 인터넷은행 보너스 (분석 결과: 평균금리 상위 3개 은행이 전부 인터넷은행)
  if (INTERNET_BANKS.some((b) => product.kor_co_nm.includes(b))) score += 15;

  // 5. 복리 보너스 (분석 결과: 복리가 단리보다 평균 0.6%p 높음, 희소 옵션)
  if (option.intr_rate_type_nm === "복리") score += 8;

  // 6. 타겟 키워드 매칭 (우대조건 텍스트에서 직업군 키워드 탐색)
  const keywords = JOB_KEYWORDS[user.job] || [];
  const text = `${product.spcl_cnd || ""} ${product.etc_note || ""}`;
  if (keywords.some((k) => text.includes(k))) score += 20;

  // 7. 금리 자체 반영
  score += Number(option.intr_rate2) * 3;

  return Math.round(score * 10) / 10;
}

function generateReason(product, option, user) {
  const reasons = [];
  const optPeriod = Number(option.save_trm);

  if (optPeriod === user.period) reasons.push("희망 운용 기간과 상품 만기가 일치함");
  else reasons.push(`희망 운용 기간(${user.period}개월)과 유사한 만기(${optPeriod}개월)`);

  if (INTERNET_BANKS.some((b) => product.kor_co_nm.includes(b))) reasons.push("인터넷은행 고금리 상품");
  if (option.intr_rate_type_nm === "복리") reasons.push("복리 적용 상품");
  if (Number(option.intr_rate2) >= 4) reasons.push(`높은 금리 (${option.intr_rate2}%)`);

  return reasons.join(" · ") || "종합 조건 기반 추천";
}

app.post("/recommend", async (req, res) => {
  try {
    const user = req.body;
    const annualIncome = user.monthlyIncome * 12 * 10000;

    const { rows } = await pool.query(
      `SELECT p.fin_prdt_cd, p.kor_co_nm, p.fin_prdt_nm, p.product_type, p.spcl_cnd, p.etc_note,
              o.save_trm, o.intr_rate2, o.intr_rate_type_nm
       FROM products p
       JOIN product_options o ON p.fin_prdt_cd = o.fin_prdt_cd`
    );

    // fin_prdt_cd 기준으로 그룹핑
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.fin_prdt_cd]) grouped[row.fin_prdt_cd] = { product: row, options: [] };
      grouped[row.fin_prdt_cd].options.push(row);
    }

    const scored = Object.values(grouped).map(({ product, options }) => {
      const bestOption = pickBestOption(options, user.period);
      const score = calculateScore(product, bestOption, user);
      return {
        id: product.fin_prdt_cd,
        bankName: product.kor_co_nm,
        productName: product.fin_prdt_nm,
        type: product.product_type,
        period: Number(bestOption.save_trm),
        interestRate: Number(bestOption.intr_rate2),
        interestType: bestOption.intr_rate_type_nm,
        score,
        recommendReason: generateReason(product, bestOption, user),
      };
    });

    const recommendedProducts = scored.sort((a, b) => b.score - a.score).slice(0, 3);

    const filteredBenefits = benefits.filter((b) => {
      if (b.minAge && user.age < b.minAge) return false;
      if (b.maxAge && user.age > b.maxAge) return false;
      if (b.maxIncome && annualIncome > b.maxIncome) return false;
      if (b.targetJob && !b.targetJob.includes(user.job)) return false;
      return true;
    });

    const top = recommendedProducts[0];
    const topBenefit = filteredBenefits[0];

    let actionRecommendation;
    if (topBenefit?.name.includes("청년")) {
      actionRecommendation = `"${topBenefit.name}" 신청 자격을 먼저 확인하고, "${top.bankName} ${top.productName}"으로 목돈 마련을 시작하세요.`;
    } else if (user.investmentPropensity === "안정") {
      actionRecommendation = `안정적인 자산 운용을 위해 "${top.bankName} ${top.productName}" 가입을 최우선으로 검토해보세요.`;
    } else {
      const savingsRate = user.monthlyIncome > 0 ? Math.round((user.monthlySavings / user.monthlyIncome) * 100) : 0;
      actionRecommendation = savingsRate === 0
        ? `"${top.bankName} ${top.productName}"으로 지금 당장 저축을 시작해보세요. 작은 금액도 괜찮습니다.`
        : `소득의 ${savingsRate}%를 저축하고 계시네요! "${top.productName}"을 통해 목표 수익률을 높여보세요.`;
    }

    res.json({
      products: recommendedProducts,
      benefits: filteredBenefits.slice(0, 3),
      actionRecommendation,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(process.env.PORT || 3001, () => console.log(`✅ Server running on port ${process.env.PORT || 3001}`));