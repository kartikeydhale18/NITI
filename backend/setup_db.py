"""
Database Initialization, Migration & Portfolio Replay Tool
Sets up portfolio.db from schema.sql, seeds initial weights into SQLite,
imports past article decisions from portfolio_decisions.csv, and optionally
replays all past article decisions through the rebalancer to show cumulative portfolio evolution.
"""
import os
import sys
import sqlite3
import pandas as pd
import csv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")
DB_PATH = os.path.join(BASE_DIR, "portfolio.db")
CSV_PATH = os.path.join(BASE_DIR, "current_portfolio.csv")
DECISIONS_CSV = os.path.join(BASE_DIR, "portfolio_decisions.csv")

from rebalancer.portfolio_manager import PortfolioManager

def init_database(reset=False):
    print(f"[*] Initializing database at: {DB_PATH}")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        if reset:
            print("[!] Resetting database tables from schema.sql...")
            cursor.execute("DROP TABLE IF EXISTS portfolio")
            cursor.execute("DROP TABLE IF EXISTS rebalance_history")
            cursor.execute("DROP TABLE IF EXISTS article_decisions")
            cursor.execute("DROP TABLE IF EXISTS fetched_articles")
            conn.commit()

        cursor.executescript(schema_sql)
        conn.commit()

        cursor.execute("SELECT COUNT(*) FROM portfolio")
        count = cursor.fetchone()[0]
        print(f"[+] 'portfolio' table ready with {count} assets.")

        # Import decisions from portfolio_decisions.csv if available
        if os.path.exists(DECISIONS_CSV):
            cursor.execute("SELECT COUNT(*) FROM article_decisions")
            existing_decisions = cursor.fetchone()[0]
            if existing_decisions == 0:
                print(f"[*] Importing past article decisions from {DECISIONS_CSV} into SQLite...")
                imported = 0
                with open(DECISIONS_CSV, "r", encoding="utf-8", errors="ignore") as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if not row or len(row) < 6:
                            continue
                        headline = row[0].strip()
                        ticker = row[1].strip()
                        try:
                            finbert_score = float(row[2])
                        except (ValueError, IndexError):
                            finbert_score = 0.0
                        try:
                            qwen_sentiment = float(row[3])
                        except (ValueError, IndexError):
                            qwen_sentiment = 0.0
                        try:
                            impact_score = int(row[4])
                        except (ValueError, IndexError):
                            impact_score = 0
                        try:
                            rebal_multiplier = float(row[5])
                        except (ValueError, IndexError):
                            rebal_multiplier = 0.0

                        cursor.execute("""
                            INSERT INTO article_decisions 
                            (headline, ticker, finbert_score, qwen_sentiment, impact_score, rebalance_multiplier)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (headline, ticker, finbert_score, qwen_sentiment, impact_score, rebal_multiplier))
                        imported += 1
                conn.commit()
                print(f"[+] Successfully imported {imported} past article decisions into SQLite 'article_decisions' table.")
            else:
                print(f"[i] 'article_decisions' table already contains {existing_decisions} records.")

        # Sync snapshot to current_portfolio.csv
        df = pd.read_sql_query("SELECT ticker, asset_name, weight, allocated_usd, last_signal, last_updated FROM portfolio ORDER BY weight DESC", conn)
        df["weight_pct"] = (df["weight"] * 100).round(2).astype(str) + "%"
        df["allocated_usd_fmt"] = df["allocated_usd"].apply(lambda x: f"${x:,.2f}")
        df.to_csv(CSV_PATH, index=False)
        print(f"[+] Synchronized current state to CSV mirror: {CSV_PATH}")

        print("\n" + "=" * 65)
        print(" CURRENT PORTFOLIO IN SQLITE (portfolio.db):")
        print("=" * 65)
        print(df[["ticker", "asset_name", "weight_pct", "allocated_usd_fmt", "last_signal"]])
        print("=" * 65)

def replay_past_decisions():
    """Replays all stored article decisions through PortfolioManager sequentially."""
    print("\n" + "=" * 65)
    print(" REPLAYING ALL PAST ARTICLE DECISIONS THROUGH REBALANCER ")
    print("=" * 65)
    init_database(reset=True)
    pm = PortfolioManager(db_path=DB_PATH, csv_path=CSV_PATH)

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT headline, ticker, rebalance_multiplier FROM article_decisions WHERE rebalance_multiplier != 0.0 AND ticker NOT IN ('UNTRADABLE', 'NONE', '') ORDER BY id ASC")
        rows = cursor.fetchall()

    print(f"\n[*] Found {len(rows)} actionable news signals to apply to portfolio...")
    for idx, (headline, ticker, mult) in enumerate(rows, 1):
        res = pm.rebalance(ticker, mult, headline)
        if res.get("status") == "REBALANCED":
            print(f"[{idx}/{len(rows)}] {ticker} (Signal: {mult:+.2f}) -> New Weight: {res['new_weight_pct']} (Shift: {res.get('change_pct', '')}) | Cash: {res['cash_weight_pct']} | {headline[:50]}...")
        elif res.get("status") == "UNTRACKED":
            print(f"[{idx}/{len(rows)}] {ticker} (Signal: {mult:+.2f}) -> Untracked (ignored)")

    print("\n" + "=" * 65)
    print(" FINAL REBALANCED PORTFOLIO AFTER ALL PAST ARTICLES:")
    print("=" * 65)
    final_df = pm.get_portfolio_df().sort_values("weight", ascending=False)
    final_df["weight_pct"] = (final_df["weight"] * 100).round(2).astype(str) + "%"
    final_df["allocated_usd_fmt"] = final_df["allocated_usd"].apply(lambda x: f"${x:,.2f}")
    print(final_df[["ticker", "asset_name", "weight_pct", "allocated_usd_fmt", "last_signal"]])
    print(f"\n[+] Saved to SQLite '{DB_PATH}' and mirrored to '{CSV_PATH}'!")

if __name__ == "__main__":
    if "--replay" in sys.argv:
        replay_past_decisions()
    elif "--reset" in sys.argv:
        init_database(reset=True)
    else:
        init_database(reset=False)
