require("dotenv").config();
const pool = require("../db");

async function run(label, query) {
  const { rows } = await pool.query(query);
  console.log(`\n=== ${label} ===`);
  console.table(rows);
}

(async () => {
  try {
    // 1. 상품 유형별(예금/적금) 평균 최고금리
    await run(
      "상품 유형별 평균 최고금리",
      `SELECT p.product_type,
              ROUND(AVG(o.intr_rate2), 2) AS avg_max_rate,
              ROUND(MAX(o.intr_rate2), 2) AS top_rate,
              COUNT(DISTINCT p.fin_prdt_cd) AS product_count
       FROM products p
       JOIN product_options o ON p.fin_prdt_cd = o.fin_prdt_cd
       GROUP BY p.product_type`
    );

    // 2. 은행별 평균 최고금리 TOP 10
    await run(
      "은행별 평균 최고금리 TOP 10",
      `SELECT p.kor_co_nm,
              ROUND(AVG(o.intr_rate2), 2) AS avg_max_rate,
              COUNT(DISTINCT p.fin_prdt_cd) AS product_count
       FROM products p
       JOIN product_options o ON p.fin_prdt_cd = o.fin_prdt_cd
       GROUP BY p.kor_co_nm
       ORDER BY avg_max_rate DESC
       LIMIT 10`
    );

    // 3. 가입기간(개월)별 평균 금리 분포
    await run(
      "가입기간별 평균 금리",
      `SELECT o.save_trm AS period_months,
              ROUND(AVG(o.intr_rate2), 2) AS avg_max_rate,
              COUNT(*) AS option_count
       FROM product_options o
       GROUP BY o.save_trm
       ORDER BY CAST(o.save_trm AS INT)`
    );

    // 4. 단리 vs 복리 금리 차이
    await run(
      "금리 방식별(단리/복리) 평균 비교",
      `SELECT intr_rate_type_nm,
              ROUND(AVG(intr_rate2), 2) AS avg_max_rate,
              COUNT(*) AS option_count
       FROM product_options
       GROUP BY intr_rate_type_nm`
    );

    // 5. 최고금리 TOP 10 상품
    await run(
      "최고금리 TOP 10 상품",
      `SELECT p.kor_co_nm, p.fin_prdt_nm, o.save_trm AS period, o.intr_rate2 AS max_rate
       FROM products p
       JOIN product_options o ON p.fin_prdt_cd = o.fin_prdt_cd
       ORDER BY o.intr_rate2 DESC
       LIMIT 10`
    );
  } catch (e) {
    console.error("에러:", e.message);
  } finally {
    await pool.end();
  }
})();
