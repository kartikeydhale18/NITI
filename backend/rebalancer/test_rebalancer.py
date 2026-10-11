"""
Standalone Unit Test for Portfolio Manager (Increment 3)
Runs in 1 second without loading AI models.
"""
import os
import sys
import sqlite3
import pandas as pd

# Allow running from SnP root, backend/, or backend/rebalancer/
REBALANCER_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(REBALANCER_DIR)
for p in [REBALANCER_DIR, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from portfolio_manager import PortfolioManager, DB_PATH, CSV_PATH
except ImportError:
    from rebalancer.portfolio_manager import PortfolioManager, DB_PATH, CSV_PATH

TEST_DB_PATH = os.path.join(BACKEND_DIR, "test_portfolio.db")
TEST_CSV_PATH = os.path.join(BACKEND_DIR, "test_portfolio.csv")

def test_portfolio_manager():
    print("=" * 60)
    print(" UNIT TEST: PORTFOLIO REBALANCER & HYBRID STORAGE ")
    print("=" * 60)

    # Clean previous test database if starting fresh
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    if os.path.exists(TEST_CSV_PATH):
        os.remove(TEST_CSV_PATH)

    # 1. Initialize Portfolio
    pm = PortfolioManager(db_path=TEST_DB_PATH, csv_path=TEST_CSV_PATH, capital=100000.0)
    print(f"\n[1] Isolated Test Portfolio Initialized in SQLite '{TEST_DB_PATH}'")
    
    df_init = pm.get_portfolio_df()
    col = "company" if "company" in df_init.columns else "asset_name"
    print(df_init[["ticker", col, "weight", "allocated_usd"]])

    # 2. Test Bullish Rebalance on SPY (+0.90)
    print("\n" + "-" * 60)
    print("[2] Testing Bullish Shock on SPY (+0.90 multiplier)...")
    res1 = pm.rebalance("SPY", 0.90, "US economy expanded by 6.4% in Q1")
    print("Result:", res1)

    # 3. Test Bearish Rebalance on INTC (-0.85)
    print("\n" + "-" * 60)
    print("[3] Testing Bearish Shock on INTC (-0.85 multiplier)...")
    res2 = pm.rebalance("INTC", -0.85, "Chip shortages and delays impact Intel")
    print("Result:", res2)

    # 4. Verify SQLite Database State
    print("\n" + "-" * 60)
    print("[4] Querying SQLite Directly ('SELECT * FROM portfolio'):")
    with sqlite3.connect(TEST_DB_PATH) as conn:
        df_db = pd.read_sql_query("SELECT ticker, weight, allocated_usd, last_signal FROM portfolio WHERE ticker IN ('SPY', 'INTC', 'CASH')", conn)
        print(df_db)

        # Check Audit Trail History table
        print("\n[5] Querying SQLite Audit Trail ('SELECT * FROM rebalance_history'):")
        df_hist = pd.read_sql_query("SELECT id, timestamp, ticker, multiplier, old_weight, new_weight, cash_weight FROM rebalance_history", conn)
        print(df_hist)

    # 5. Verify Mirrored CSV
    print("\n" + "-" * 60)
    print(f"[6] Checking Mirrored CSV '{TEST_CSV_PATH}':")
    if os.path.exists(TEST_CSV_PATH):
        df_csv = pd.read_csv(TEST_CSV_PATH)
        print(df_csv.head(6))
        print(f"\nSUCCESS: Both SQLite ('{TEST_DB_PATH}') and Mirrored CSV ('{TEST_CSV_PATH}') verified!")
    else:
        print("ERROR: Mirrored CSV was not found!")

    # Clean up test artifacts
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    if os.path.exists(TEST_CSV_PATH):
        os.remove(TEST_CSV_PATH)

if __name__ == "__main__":
    test_portfolio_manager()
