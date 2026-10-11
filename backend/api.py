import os
import sys
import json
import re
import sqlite3
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from rebalancer.portfolio_manager import PortfolioManager, TOTAL_CAPITAL_USD
from setup_db import init_database
from data_ingestion.data_ingestion import DataIngestor

DATASET_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "dataset"))
ingestor = DataIngestor()

app = FastAPI(
    title="NITI AI Financial Risk Engine API",
    description="REST API for Tactical Portfolio Rebalancing and Dual-Model Sentiment Analysis",
    version="1.0.0"
)

# Enable CORS for React frontend (Vite runs on localhost:5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared Singletons
portfolio_mgr = PortfolioManager()
_finbert_instance = None
_qwen_instance = None

TICKERS_FILE = os.path.join(BASE_DIR, "tickers.json")

def load_tradable_universe():
    if os.path.exists(TICKERS_FILE):
        with open(TICKERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

TRADABLE_UNIVERSE = load_tradable_universe()
SORTED_UNIVERSE_KEYS = sorted(
    [k for k in TRADABLE_UNIVERSE.keys() if len(k) >= 2 and TRADABLE_UNIVERSE[k] != 'UNTRADABLE'],
    key=len,
    reverse=True
)

def get_sentiment_analyzer():
    global _finbert_instance
    if _finbert_instance is None:
        from sentiment_analyzer.sentiment_analysis import SentimentAnalyzer
        _finbert_instance = SentimentAnalyzer()
    return _finbert_instance

def get_qwen_validator():
    global _qwen_instance
    if _qwen_instance is None:
        from sentiment_analyzer.validator_llm import QwenValidator
        _qwen_instance = QwenValidator()
    return _qwen_instance

def resolve_company_and_ticker(qwen_company: str, article_text: str):
    raw_upper = str(qwen_company).strip().upper()
    text_upper = article_text.upper()
    
    if raw_upper and raw_upper not in ['NONE', 'UNKNOWN', 'NULL', 'N/A', '']:
        ticker = TRADABLE_UNIVERSE.get(raw_upper)
        if ticker and ticker != 'UNTRADABLE':
            is_macro_tag = raw_upper in ['US MACRO', 'US ECONOMY', 'S&P 500', 'FEDERAL RESERVE', 'FED', 'WALL STREET']
            company_in_text = (raw_upper in text_upper) or (ticker in text_upper)
            if is_macro_tag or company_in_text:
                return raw_upper, ticker

    for candidate in SORTED_UNIVERSE_KEYS:
        pattern = r'(?:\b|^)' + re.escape(candidate) + r'(?:\b|$)'
        if re.search(pattern, text_upper):
            matched_ticker = TRADABLE_UNIVERSE[candidate]
            if matched_ticker != 'UNTRADABLE':
                return candidate, matched_ticker

    return raw_upper, 'UNTRADABLE'

# Pydantic Request Models
class RebalanceRequest(BaseModel):
    headline: str
    content: Optional[str] = ""
    ticker_override: Optional[str] = None
    article_id: Optional[int] = None
    force: Optional[bool] = False

class FetchNewsRequest(BaseModel):
    source: str = "csv"  # "csv" or "newsapi"
    csv_filename: Optional[str] = "newsdata_labelled_v2.csv"
    query: Optional[str] = "finance OR stocks OR economy"
    limit: Optional[int] = 10
    offset: Optional[int] = 0

@app.get("/api/status")
def get_status():
    return {
        "status": "online",
        "engine": "NITI Tactical Portfolio Rebalancing Engine",
        "models_cached": {
            "finbert": _finbert_instance is not None,
            "qwen": _qwen_instance is not None
        },
        "tradable_universe_size": len(TRADABLE_UNIVERSE)
    }

@app.get("/api/news-sources")
def get_news_sources():
    csv_files = []
    if os.path.exists(DATASET_DIR):
        for f in os.listdir(DATASET_DIR):
            if f.endswith(".csv"):
                csv_files.append(f)
    csv_files.sort()
    has_newsapi_key = bool(os.environ.get("NEWS_API_KEY"))
    return {
        "csv_files": csv_files,
        "default_csv": "newsdata_labelled_v2.csv" if "newsdata_labelled_v2.csv" in csv_files else (csv_files[0] if csv_files else ""),
        "has_newsapi_key": has_newsapi_key
    }

@app.get("/api/fetched-articles")
def get_fetched_articles(status: Optional[str] = None, limit: int = 50):
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM fetched_articles")
        total_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM fetched_articles WHERE status = 'PENDING'")
        pending_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM fetched_articles WHERE status = 'ANALYZED'")
        analyzed_count = cursor.fetchone()[0]

        if status and status.upper() in ['PENDING', 'ANALYZED']:
            cursor.execute("""
                SELECT id, headline, content, ticker, source, published_date, status, analyzed_multiplier, analyzed_at
                FROM fetched_articles
                WHERE status = ?
                ORDER BY id DESC LIMIT ?
            """, (status.upper(), limit))
        else:
            cursor.execute("""
                SELECT id, headline, content, ticker, source, published_date, status, analyzed_multiplier, analyzed_at
                FROM fetched_articles
                ORDER BY id DESC LIMIT ?
            """, (limit,))

        rows = cursor.fetchall()
        articles = []
        for r in rows:
            articles.append({
                "id": r[0],
                "headline": r[1],
                "content": r[2],
                "ticker": r[3],
                "source": r[4],
                "datetime": r[5],
                "status": r[6],
                "analyzed_multiplier": r[7],
                "analyzed_at": r[8]
            })

        return {
            "total": total_count,
            "pending": pending_count,
            "analyzed": analyzed_count,
            "articles": articles
        }

@app.post("/api/clear-articles")
def clear_articles(status: str = "PENDING"):
    """
    Prune or clear articles from SQLite to optimize storage.
    status: 'PENDING' (clears only unanalyzed articles), 'ANALYZED', or 'ALL'
    """
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        if status.upper() == "ALL":
            cursor.execute("DELETE FROM fetched_articles")
        elif status.upper() == "PENDING":
            cursor.execute("DELETE FROM fetched_articles WHERE status = 'PENDING'")
        elif status.upper() == "ANALYZED":
            cursor.execute("DELETE FROM fetched_articles WHERE status = 'ANALYZED'")
        deleted = cursor.rowcount
        conn.commit()
    return {"deleted": deleted, "target_status": status.upper()}

@app.post("/api/fetch-news")
def fetch_news(req: FetchNewsRequest):
    raw_articles = []
    if req.source == "csv":
        csv_file = req.csv_filename or "newsdata_labelled_v2.csv"
        file_path = os.path.join(DATASET_DIR, csv_file)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"CSV file not found: {csv_file}")
        
        df = ingestor.ingest_csv(file_path)
        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="Could not read CSV dataset.")
        
        total_count = len(df)
        start = req.offset or 0
        limit = req.limit or 10
        end = min(total_count, start + limit)
        subset = df.iloc[start:end]
        
        for idx, row in subset.iterrows():
            headline = str(row.get("headline", "")).strip()
            content = str(row.get("content", "")).strip() if "content" in row else ""
            ticker = str(row.get("ticker", "")).strip() if "ticker" in row else ""
            dt = str(row.get("datetime", "")).strip() if "datetime" in row else ""
            if headline:
                raw_articles.append({
                    "headline": headline,
                    "content": content,
                    "ticker": ticker if ticker and ticker != "nan" else "",
                    "datetime": dt if dt and dt != "nan" else "",
                    "source": f"CSV: {csv_file}"
                })
        
    elif req.source == "newsapi":
        query = req.query or "stocks OR finance"
        api_articles = ingestor.fetch_news_api(query=query)
        if not api_articles:
            raise HTTPException(
                status_code=400, 
                detail="Could not fetch news from NewsAPI. Ensure NEWS_API_KEY is configured in your .env file or environment."
            )
            
        limit = req.limit or 10
        for art in api_articles[:limit]:
            title = str(art.get("title", "")).strip()
            if title:
                raw_articles.append({
                    "headline": title,
                    "content": str(art.get("description", "") or "").strip(),
                    "ticker": "",
                    "datetime": str(art.get("publishedAt", "") or ""),
                    "source": str(art.get("source", {}).get("name", "NewsAPI"))
                })
    else:
        raise HTTPException(status_code=400, detail="Invalid source. Must be 'csv' or 'newsapi'.")

    # Persist into SQLite fetched_articles with INSERT OR IGNORE (zero duplicates & zero bloat)
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        for art in raw_articles:
            cursor.execute("""
                INSERT OR IGNORE INTO fetched_articles 
                (headline, content, ticker, source, published_date, status)
                VALUES (?, ?, ?, ?, ?, 'PENDING')
            """, (art["headline"], art["content"], art["ticker"], art["source"], art["datetime"]))
        conn.commit()

        # Query back the articles with their true SQLite IDs and current status
        headlines = [a["headline"] for a in raw_articles]
        placeholders = ",".join("?" for _ in headlines)
        cursor.execute(f"""
            SELECT id, headline, content, ticker, source, published_date, status, analyzed_multiplier, analyzed_at
            FROM fetched_articles
            WHERE headline IN ({placeholders})
            ORDER BY id ASC
        """, headlines)
        
        rows = cursor.fetchall()
        articles = []
        for r in rows:
            articles.append({
                "id": r[0],
                "headline": r[1],
                "content": r[2],
                "ticker": r[3],
                "source": r[4],
                "datetime": r[5],
                "status": r[6],
                "analyzed_multiplier": r[7],
                "analyzed_at": r[8]
            })

    return {
        "source": req.source,
        "articles": articles
    }


@app.get("/api/portfolio")
def get_portfolio():
    df = portfolio_mgr.get_portfolio_df()
    if df.empty:
        return {"holdings": [], "summary": {}}
    
    # Sort holdings: Cash first, then stocks by weight descending
    records = df.to_dict(orient="records")
    for r in records:
        r["weight_pct"] = round(r["weight"] * 100, 2)
        r["allocated_formatted"] = f"${r['allocated_usd']:,.2f}"

    cash_row = next((r for r in records if r["ticker"] == "CASH"), None)
    cash_weight = cash_row["weight_pct"] if cash_row else 2.0
    cash_usd = cash_row["allocated_usd"] if cash_row else 2000.0
    invested_usd = TOTAL_CAPITAL_USD - cash_usd
    invested_pct = round(100.0 - cash_weight, 2)
    stock_holdings = [r for r in records if r["ticker"] != "CASH"]

    summary = {
        "total_capital": TOTAL_CAPITAL_USD,
        "cash_pct": cash_weight,
        "cash_usd": cash_usd,
        "invested_pct": invested_pct,
        "invested_usd": invested_usd,
        "holdings_count": len(stock_holdings),
        "total_assets_count": len(records)
    }

    return {
        "holdings": records,
        "summary": summary
    }

@app.get("/api/history")
def get_history(limit: int = 50):
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, ticker, multiplier, old_weight, new_weight, cash_weight, headline 
            FROM rebalance_history 
            ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "timestamp": row[1],
                "ticker": row[2],
                "multiplier": row[3],
                "old_weight_pct": round(row[4] * 100, 2),
                "new_weight_pct": round(row[5] * 100, 2),
                "change_pct": round((row[5] - row[4]) * 100, 2),
                "cash_weight_pct": round(row[6] * 100, 2),
                "headline": row[7]
            })

        return {"history": history}

@app.post("/api/rebalance")
def run_rebalance(req: RebalanceRequest):
    if not req.headline or not req.headline.strip():
        raise HTTPException(status_code=400, detail="Headline cannot be empty.")
    
    clean_headline = req.headline.strip()

    # Check if article is already marked ANALYZED in SQLite to prevent duplicate rebalancing
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, status, analyzed_multiplier, analyzed_at, ticker 
            FROM fetched_articles 
            WHERE headline = ? OR (id = ? AND id IS NOT NULL)
        """, (clean_headline, req.article_id))
        existing = cursor.fetchone()
        if existing and existing[1] == 'ANALYZED' and not req.force:
            return {
                "status": "ALREADY_ANALYZED",
                "headline": clean_headline,
                "resolved_company": existing[4] or "",
                "resolved_ticker": existing[4] or "",
                "final_multiplier": existing[2],
                "analyzed_at": existing[3],
                "already_analyzed": True,
                "decision_logic": f"Integrity Guard: This article was already analyzed (Multiplier: {existing[2]:+.2f} on {existing[3]}). Duplicate rebalance was safely blocked.",
                "rebalance_result": None
            }

    full_text = f"{clean_headline}. {req.content.strip()}".strip()

    # 1. FinBERT Analysis
    finbert = get_sentiment_analyzer()
    finbert_score = finbert.analyze_text(full_text)

    # 2. Qwen JSON Extraction & Evaluation
    qwen = get_qwen_validator()
    qwen_json = qwen.analyze_article(full_text)

    # 3. Hybrid Ticker Resolution
    if req.ticker_override and req.ticker_override.strip():
        resolved_ticker = req.ticker_override.strip().upper()
        resolved_company = next((k for k, v in TRADABLE_UNIVERSE.items() if v == resolved_ticker), resolved_ticker)
    else:
        raw_company = str(qwen_json.get('company_name', 'Unknown')).strip().upper()
        resolved_company, resolved_ticker = resolve_company_and_ticker(raw_company, full_text)

    qwen_json['company_name'] = resolved_company
    qwen_json['ticker'] = resolved_ticker

    # 4. Decision Engine
    try:
        qwen_sentiment = float(qwen_json.get('sentiment_score', 0.0))
    except (ValueError, TypeError):
        qwen_sentiment = 0.0

    try:
        impact = int(qwen_json.get("impact_score", 0))
    except (ValueError, TypeError):
        impact = 0

    both_positive = finbert_score > 0.15 and qwen_sentiment > 0.15
    both_negative = finbert_score < -0.15 and qwen_sentiment < -0.15
    both_neutral = abs(finbert_score) <= 0.15 and abs(qwen_sentiment) <= 0.15

    if both_positive or both_negative:
        decision_logic = "Consensus: Both models agree on sentiment direction. Weighted blend (60% FinBERT + 40% Qwen)."
        final_sentiment = round(0.6 * finbert_score + 0.4 * qwen_sentiment, 2)
    elif both_neutral:
        decision_logic = "Consensus: Both models identify news as neutral."
        final_sentiment = 0.0
    else:
        override_threshold = 6 if (abs(finbert_score) <= 0.15 or abs(qwen_sentiment) <= 0.15) else 7
        if impact >= override_threshold:
            decision_logic = f"High-Impact Override: Models disagree, but Qwen impact is {impact}/10 (>= {override_threshold}). Overriding with Qwen."
            final_sentiment = qwen_sentiment
        else:
            decision_logic = f"Low-Impact Disagreement: Models disagree and impact is low ({impact}/10 < {override_threshold}). Safely ignoring."
            final_sentiment = 0.0

    final_multiplier = final_sentiment
    if not resolved_ticker or resolved_ticker in ['UNTRADABLE', 'NONE', 'UNKNOWN', 'NULL', '']:
        decision_logic += f" [Guard: Entity '{resolved_company}' is untradable, multiplier set to 0.0]"
        final_multiplier = 0.0

    # 5. Execute Rebalance in SQLite
    rebalance_result = None
    if final_multiplier != 0.0 and resolved_ticker not in ['UNTRADABLE', 'NONE', '']:
        rebalance_result = portfolio_mgr.rebalance(resolved_ticker, final_multiplier, clean_headline)
        portfolio_mgr.log_decision(
            headline=clean_headline,
            ticker=resolved_ticker,
            finbert_score=finbert_score,
            qwen_sentiment=qwen_sentiment,
            impact_score=impact,
            multiplier=final_multiplier
        )

    # 6. Mark article as ANALYZED in fetched_articles table
    with portfolio_mgr._get_connection() as conn:
        cursor = conn.cursor()
        from datetime import datetime
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            INSERT INTO fetched_articles (headline, content, ticker, source, status, analyzed_multiplier, analyzed_at)
            VALUES (?, ?, ?, 'Manual / Ingested', 'ANALYZED', ?, ?)
            ON CONFLICT(headline) DO UPDATE SET 
                status = 'ANALYZED',
                analyzed_multiplier = excluded.analyzed_multiplier,
                analyzed_at = excluded.analyzed_at
        """, (clean_headline, req.content or '', resolved_ticker, final_multiplier, now_str))
        conn.commit()

    return {
        "headline": clean_headline,
        "resolved_company": resolved_company,
        "resolved_ticker": resolved_ticker,
        "finbert_score": finbert_score,
        "qwen_sentiment": qwen_sentiment,
        "impact_score": impact,
        "event_type": qwen_json.get("event_type", "General Financial"),
        "rationale": qwen_json.get("rationale", ""),
        "decision_logic": decision_logic,
        "final_multiplier": final_multiplier,
        "rebalance_result": rebalance_result,
        "already_analyzed": False
    }


@app.post("/api/reset")
def reset_portfolio():
    init_database(reset=True)
    return {
        "status": "success",
        "message": "Portfolio database has been successfully reset to starting weights."
    }

@app.get("/api/sample-scenarios")
def get_sample_scenarios():
    return [
        {
            "id": 1,
            "title": "Apple Record Q4 Earnings & AI Supercycle",
            "headline": "Apple smashes Wall Street estimates with record iPhone sales and launches proprietary M5 AI coprocessor ecosystem.",
            "ticker": "AAPL",
            "category": "Earnings / Product",
            "expected": "Bullish (+0.8 to +1.0)"
        },
        {
            "id": 2,
            "title": "Fed Announces Aggressive Interest Rate Cut",
            "headline": "Federal Reserve cuts interest rates by 50 basis points citing cooling inflation and robust economic resilience.",
            "ticker": "SPY",
            "category": "US Macro",
            "expected": "Bullish (+0.7 to +0.9)"
        },
        {
            "id": 3,
            "title": "Intel Foundry Production Delay & Losses",
            "headline": "Intel pauses next-generation 18A manufacturing expansion due to yield defects and projects severe quarterly margin contraction.",
            "ticker": "INTC",
            "category": "Supply Chain / Earnings",
            "expected": "Bearish (-0.7 to -0.9)"
        },
        {
            "id": 4,
            "title": "Microsoft Enterprise Cloud Cloud Security Breach",
            "headline": "Microsoft confirms major vulnerability exploited in Azure Government infrastructure, facing congressional scrutiny.",
            "ticker": "MSFT",
            "category": "Regulatory / Security",
            "expected": "Bearish (-0.5 to -0.7)"
        },
        {
            "id": 5,
            "title": "US Non-Farm Payrolls Surge Exceeds Forecast",
            "headline": "US job growth beats forecasts with 280,000 new non-farm payroll positions, signaling immense economic expansion.",
            "ticker": "SPY",
            "category": "US Macro",
            "expected": "Bullish (+0.6 to +0.8)"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
