-- ========================================================
-- Schema: SnP Risk Engine & Portfolio Rebalancer Database
-- Database: portfolio.db (SQLite)
-- ========================================================

-- 1. Active Portfolio Holdings Table (Weights & Capital)
CREATE TABLE IF NOT EXISTS portfolio (
    ticker TEXT PRIMARY KEY,
    asset_name TEXT NOT NULL,
    weight REAL NOT NULL CHECK(weight >= 0.0 AND weight <= 1.0),
    allocated_usd REAL NOT NULL CHECK(allocated_usd >= 0.0),
    last_signal REAL DEFAULT 0.0,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Audit Trail History Table (Records every rebalance event)
CREATE TABLE IF NOT EXISTS rebalance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    ticker TEXT NOT NULL,
    multiplier REAL NOT NULL,
    old_weight REAL NOT NULL,
    new_weight REAL NOT NULL,
    cash_weight REAL NOT NULL,
    headline TEXT
);

-- 3. AI Decisions & Signals Table (FinBERT + Qwen consensus)
CREATE TABLE IF NOT EXISTS article_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    headline TEXT,
    ticker TEXT,
    finbert_score REAL,
    qwen_sentiment REAL,
    impact_score INTEGER,
    rebalance_multiplier REAL
);

-- 4. Fetched Ingested Articles Table (Tracks article pipeline status & deduplication)
CREATE TABLE IF NOT EXISTS fetched_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    headline TEXT NOT NULL UNIQUE,
    content TEXT DEFAULT '',
    ticker TEXT DEFAULT '',
    source TEXT DEFAULT '',
    published_date TEXT DEFAULT '',
    status TEXT DEFAULT 'PENDING',
    analyzed_multiplier REAL DEFAULT NULL,
    analyzed_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_articles_status ON fetched_articles(status);

-- ========================================================
-- Initial Portfolio Seed Data ($100,000 Starting Fund)
-- ========================================================
INSERT OR IGNORE INTO portfolio (ticker, asset_name, weight, allocated_usd, last_signal, last_updated) VALUES
('SPY',   'S&P 500 Index ETF', 0.15, 15000.0, 0.0, CURRENT_TIMESTAMP),
('AAPL',  'Apple Inc',         0.10, 10000.0, 0.0, CURRENT_TIMESTAMP),
('MSFT',  'Microsoft Corp',    0.10, 10000.0, 0.0, CURRENT_TIMESTAMP),
('GOOGL', 'Alphabet Inc',      0.10, 10000.0, 0.0, CURRENT_TIMESTAMP),
('NVDA',  'NVIDIA Corp',       0.08,  8000.0, 0.0, CURRENT_TIMESTAMP),
('AMZN',  'Amazon.com Inc',    0.08,  8000.0, 0.0, CURRENT_TIMESTAMP),
('JPM',   'JPMorgan Chase',    0.07,  7000.0, 0.0, CURRENT_TIMESTAMP),
('TSLA',  'Tesla Inc',         0.06,  6000.0, 0.0, CURRENT_TIMESTAMP),
('SHEL',  'Shell Plc',         0.05,  5000.0, 0.0, CURRENT_TIMESTAMP),
('INTC',  'Intel Corp',        0.05,  5000.0, 0.0, CURRENT_TIMESTAMP),
('TSN',   'Tyson Foods',       0.04,  4000.0, 0.0, CURRENT_TIMESTAMP),
('CASH',  'Cash Reserves',     0.12, 12000.0, 0.0, CURRENT_TIMESTAMP);
