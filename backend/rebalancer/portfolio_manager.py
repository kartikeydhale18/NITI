import sqlite3
import os
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "portfolio.db")
CSV_PATH = os.path.join(BASE_DIR, "current_portfolio.csv")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
TOTAL_CAPITAL_USD = 100000.0  # $100,000 Portfolio
MIN_STOCK_WEIGHT = 0.02       # PRD Section 14: 2% minimum stock weight
MAX_STOCK_WEIGHT = 0.15       # PRD Section 14: 15% maximum stock weight
MAX_EVENT_CHANGE = 0.05       # PRD Section 14: 5 percentage-point maximum event adjustment
MIN_CASH_PCT = 0.02           # Minimum 2% cash floor

class PortfolioManager:
    def __init__(self, db_path=DB_PATH, csv_path=CSV_PATH, capital=TOTAL_CAPITAL_USD):
        self.db_path = db_path
        self.csv_path = csv_path
        self.capital = capital
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        """Initializes SQLite schema and starting portfolio weights from schema.sql if empty."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if portfolio table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='portfolio'")
            table_exists = cursor.fetchone()
            
            needs_init = False
            if not table_exists:
                needs_init = True
            else:
                cursor.execute("SELECT COUNT(*) FROM portfolio")
                if cursor.fetchone()[0] == 0:
                    needs_init = True
            
            if needs_init:
                if os.path.exists(SCHEMA_PATH):
                    print(f"[Database]: Initializing portfolio tables and weights from {SCHEMA_PATH}...")
                    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
                        cursor.executescript(f.read())
                    conn.commit()
                    self._sync_csv_mirror(conn)
                else:
                    raise FileNotFoundError(f"Database schema file not found at {SCHEMA_PATH}")

    def log_decision(self, headline: str, ticker: str, finbert_score: float, qwen_sentiment: float, impact_score: int, multiplier: float):
        """Logs an article AI decision directly into the SQLite article_decisions table."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO article_decisions 
                (headline, ticker, finbert_score, qwen_sentiment, impact_score, rebalance_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (headline, ticker, finbert_score, qwen_sentiment, impact_score, multiplier))
            conn.commit()
            return cursor.lastrowid

    def _sync_csv_mirror(self, conn):
        """Dumps SQLite state to human-readable CSV for visual inspection."""
        df = pd.read_sql_query("SELECT * FROM portfolio ORDER BY weight DESC", conn)
        df["weight_pct"] = (df["weight"] * 100).round(2).astype(str) + "%"
        df["allocated_usd"] = df["allocated_usd"].apply(lambda x: f"${x:,.2f}")
        df.to_csv(self.csv_path, index=False)

    def get_portfolio_df(self):
        """Returns active holdings as a clean Pandas DataFrame."""
        with self._get_connection() as conn:
            return pd.read_sql_query("SELECT * FROM portfolio", conn)

    def rebalance(self, ticker: str, multiplier: float, headline: str = "") -> dict:
        """
        Calculates and applies portfolio rebalance based on the risk engine multiplier.
        - Enforces 5 percentage-point max event adjustment.
        - Enforces minimum 2% and maximum 15% stock caps.
        - Preserves 100% conservation against Cash reserves.
        - Logs audit trail to rebalance_history table.
        """
        ticker = str(ticker).strip().upper()
        if not ticker or ticker in ["UNTRADABLE", "NONE", "UNKNOWN", "N/A"] or abs(multiplier) < 0.01:
            return {"status": "NO_ACTION", "reason": f"Multiplier {multiplier} is neutral/zero or ticker '{ticker}' is untradable"}

        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch current stock holding and cash holding
            cursor.execute("SELECT weight, asset_name FROM portfolio WHERE ticker = ?", (ticker,))
            stock_row = cursor.fetchone()
            
            cursor.execute("SELECT weight FROM portfolio WHERE ticker = 'CASH'")
            cash_row = cursor.fetchone()
            current_cash = cash_row[0] if cash_row else MIN_CASH_PCT
            
            # If stock isn't in portfolio yet, decide whether to open a new position
            if stock_row is None:
                if multiplier > 0.4 and current_cash > (MIN_CASH_PCT + MIN_STOCK_WEIGHT):
                    initial_pos = MIN_STOCK_WEIGHT
                    current_stock_weight = 0.0
                    new_stock_weight = initial_pos
                    new_cash_weight = round(current_cash - initial_pos, 4)
                    asset_name = f"{ticker} Holding"
                    cursor.execute("""
                        INSERT INTO portfolio (ticker, asset_name, weight, allocated_usd, last_signal, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (ticker, asset_name, 0.0, 0.0, 0.0, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
                else:
                    return {"status": "UNTRACKED", "reason": f"'{ticker}' is not in active portfolio holdings and signal is neutral/bearish"}
            else:
                current_stock_weight = stock_row[0]
                asset_name = stock_row[1]

                # Cap single event adjustment at 5 percentage points
                raw_shift = abs(multiplier) * MAX_EVENT_CHANGE
                actual_shift = min(raw_shift, MAX_EVENT_CHANGE)
                
                if multiplier > 0:
                    # Bullish: Buy stock, spend cash, subject to MAX_STOCK_WEIGHT (15%)
                    available_cash = max(0.0, current_cash - MIN_CASH_PCT)
                    actual_shift = min(actual_shift, available_cash)
                    if (current_stock_weight + actual_shift) > MAX_STOCK_WEIGHT:
                        actual_shift = max(0.0, MAX_STOCK_WEIGHT - current_stock_weight)
                    
                    new_stock_weight = round(current_stock_weight + actual_shift, 4)
                    new_cash_weight = round(current_cash - actual_shift, 4)
                else:
                    # Bearish: Sell stock, increase cash, subject to MIN_STOCK_WEIGHT (2%)
                    max_reduction = max(0.0, current_stock_weight - MIN_STOCK_WEIGHT)
                    actual_shift = min(actual_shift, max_reduction)
                    new_stock_weight = round(current_stock_weight - actual_shift, 4)
                    new_cash_weight = round(current_cash + actual_shift, 4)

            # Update SQLite state
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            allocated_stock = round(new_stock_weight * self.capital, 2)
            allocated_cash = round(new_cash_weight * self.capital, 2)
            weight_change = round(new_stock_weight - current_stock_weight, 4)

            cursor.execute("""
                UPDATE portfolio 
                SET weight = ?, allocated_usd = ?, last_signal = ?, last_updated = ?
                WHERE ticker = ?
            """, (new_stock_weight, allocated_stock, multiplier, now_str, ticker))
            
            cursor.execute("""
                UPDATE portfolio 
                SET weight = ?, allocated_usd = ?, last_updated = ?
                WHERE ticker = 'CASH'
            """, (new_cash_weight, allocated_cash, now_str))

            # Record in Audit History table
            cursor.execute("""
                INSERT INTO rebalance_history (timestamp, ticker, multiplier, old_weight, new_weight, cash_weight, headline)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (now_str, ticker, multiplier, current_stock_weight, new_stock_weight, new_cash_weight, headline[:200]))

            conn.commit()
            
            # Sync to mirrored CSV
            self._sync_csv_mirror(conn)

            result = {
                "status": "REBALANCED",
                "ticker": ticker,
                "asset_name": asset_name,
                "old_weight_pct": f"{current_stock_weight*100:.2f}%",
                "new_weight_pct": f"{new_stock_weight*100:.2f}%",
                "cash_weight_pct": f"{new_cash_weight*100:.2f}%",
                "allocated_usd": f"${allocated_stock:,.2f}",
                "change_pct": f"{weight_change*100:+.2f}%",
                "multiplier": multiplier
            }
            return result

if __name__ == "__main__":
    # Self-test unit check
    print("Testing PortfolioManager...")
    pm = PortfolioManager()
    print("\nInitial Portfolio Snapshot:")
    print(pm.get_portfolio_df()[["ticker", "asset_name", "weight", "allocated_usd"]])
    
    # Test bullish adjustment on SPY
    res_pos = pm.rebalance("SPY", 0.90, "S&P 500 hits record high")
    print("\nBullish Test Result:", res_pos)
    
    # Test bearish adjustment on INTC
    res_neg = pm.rebalance("INTC", -0.80, "Chip production issues")
    print("\nBearish Test Result:", res_neg)
    
    print("\nUpdated Portfolio Snapshot:")
    print(pm.get_portfolio_df()[["ticker", "weight", "allocated_usd"]])
    print(f"\nMirrored CSV generated at: {CSV_PATH}")
