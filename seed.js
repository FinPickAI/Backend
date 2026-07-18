require("dotenv").config();
const pool = require("./db");
const { fetchProducts } = require("./fssApi");

async function seedType(type) {
  const { baseList, optionList } = await fetchProducts(type);

  for (const p of baseList) {
    await pool.query(
      `INSERT INTO products (fin_prdt_cd, fin_co_no, kor_co_nm, fin_prdt_nm, join_way, join_member, spcl_cnd, etc_note, product_type, dcls_strt_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (fin_prdt_cd) DO UPDATE SET
         kor_co_nm = EXCLUDED.kor_co_nm,
         fin_prdt_nm = EXCLUDED.fin_prdt_nm,
         spcl_cnd = EXCLUDED.spcl_cnd,
         etc_note = EXCLUDED.etc_note`,
      [p.fin_prdt_cd, p.fin_co_no, p.kor_co_nm, p.fin_prdt_nm, p.join_way, p.join_member, p.spcl_cnd, p.etc_note, type, p.dcls_strt_day]
    );
  }

  for (const o of optionList) {
    await pool.query(
      `INSERT INTO product_options (fin_prdt_cd, intr_rate_type_nm, save_trm, intr_rate, intr_rate2)
       VALUES ($1,$2,$3,$4,$5)`,
      [o.fin_prdt_cd, o.intr_rate_type_nm, o.save_trm, o.intr_rate, o.intr_rate2]
    );
  }

  console.log(`${type}: 상품 ${baseList.length}건, 옵션 ${optionList.length}건 저장 완료`);
}

(async () => {
  try {
    await seedType("deposit");
    await seedType("savings");
  } catch (e) {
    console.error("에러:", e.message);
  } finally {
    await pool.end();
  }
})();