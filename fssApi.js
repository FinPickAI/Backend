const axios = require("axios");

const BASE_URL = "https://finlife.fss.or.kr/finlifeapi";
const AUTH_KEY = process.env.FSS_API_KEY;

// topFinGrpNo: 020000 = 은행, 030300 = 저축은행
async function fetchProducts(type, topFinGrpNo = "020000") {
  // type: "deposit" -> depositProductsSearch, "savings" -> savingProductsSearch
  const endpoint = type === "deposit" ? "depositProductsSearch" : "savingProductsSearch";
  const url = `${BASE_URL}/${endpoint}.json`;

  const res = await axios.get(url, {
    params: { auth: AUTH_KEY, topFinGrpNo, pageNo: 1 },
  });

  const result = res.data?.result;
  if (!result || result.err_cd !== "000") {
    throw new Error(`FSS API 오류: ${result?.err_cd} ${result?.err_msg}`);
  }

  // baseList: 상품 기본정보, optionList: 금리/우대조건 등 옵션정보 (1:N 관계, fin_prdt_cd로 join)
  return {
    baseList: result.baseList,
    optionList: result.optionList,
  };
}

module.exports = { fetchProducts };