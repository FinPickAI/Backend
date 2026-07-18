require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./db");

(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
    await pool.query(schema);
    console.log("테이블 생성 완료");
  } catch (e) {
    console.error("에러:", e.message);
  } finally {
    await pool.end();
  }
})();