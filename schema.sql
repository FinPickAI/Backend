CREATE TABLE IF NOT EXISTS products (
  fin_prdt_cd TEXT PRIMARY KEY,
  fin_co_no TEXT,
  kor_co_nm TEXT NOT NULL,
  fin_prdt_nm TEXT NOT NULL,
  join_way TEXT,
  join_member TEXT,
  spcl_cnd TEXT,
  etc_note TEXT,
  product_type TEXT NOT NULL,
  dcls_strt_day TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_options (
  id SERIAL PRIMARY KEY,
  fin_prdt_cd TEXT REFERENCES products(fin_prdt_cd) ON DELETE CASCADE,
  intr_rate_type_nm TEXT,
  save_trm TEXT,
  intr_rate NUMERIC,
  intr_rate2 NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_options_fin_prdt_cd ON product_options(fin_prdt_cd);