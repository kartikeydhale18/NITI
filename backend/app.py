import os
import json
import csv
import hashlib
import random
import re
from data_ingestion import DataIngestor
from sentiment_analysis import SentimentAnalyzer
from validator_llm import QwenValidator

PROCESSED_TRACKER_FILE = "processed_articles.json"
RESULTS_FILE = "portfolio_decisions.csv"

# Load Tradable Universe from external JSON file
TICKERS_FILE = "tickers.json"

def load_tradable_universe():
    """Loads the massive hashmap of company names to stock tickers."""
    if os.path.exists(TICKERS_FILE):
        with open(TICKERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

TRADABLE_UNIVERSE = load_tradable_universe()

# Precompute universe keys sorted by length descending (longest names like 'S&P 500' match before 'S&P')
SORTED_UNIVERSE_KEYS = sorted(
    [k for k in TRADABLE_UNIVERSE.keys() if len(k) >= 2 and TRADABLE_UNIVERSE[k] != 'UNTRADABLE'],
    key=len,
    reverse=True
)

def resolve_company_and_ticker(qwen_company: str, article_text: str):
    """
    Robust hybrid resolution:
    1. Checks if Qwen's extracted company exists in TRADABLE_UNIVERSE and is actually mentioned in the text.
    2. If Qwen hallucinated a company, returned 'NONE', or an untradable entity,
       scans the article headline text for known tradable companies/indices.
    """
    raw_upper = str(qwen_company).strip().upper()
    text_upper = article_text.upper()
    
    # 1. Check if Qwen's entity is in universe and verified in text
    if raw_upper and raw_upper not in ['NONE', 'UNKNOWN', 'NULL', 'N/A', '']:
        ticker = TRADABLE_UNIVERSE.get(raw_upper)
        if ticker and ticker != 'UNTRADABLE':
            # Hallucination Guard: Ensure company name or ticker actually appears in text
            # OR is an approved US macro tag
            is_macro_tag = raw_upper in ['US MACRO', 'US ECONOMY', 'S&P 500', 'FEDERAL RESERVE', 'FED', 'WALL STREET']
            company_in_text = (raw_upper in text_upper) or (ticker in text_upper)
            if is_macro_tag or company_in_text:
                return raw_upper, ticker

    # Fallback: Direct scan of article text against known universe
    for candidate in SORTED_UNIVERSE_KEYS:
        pattern = r'(?:\b|^)' + re.escape(candidate) + r'(?:\b|$)'
        if re.search(pattern, text_upper):
            matched_ticker = TRADABLE_UNIVERSE[candidate]
            if matched_ticker != 'UNTRADABLE':
                return candidate, matched_ticker

    return raw_upper, 'UNTRADABLE'

def load_processed_articles():
    """Loads a list of article hashes that have already been evaluated."""
    if os.path.exists(PROCESSED_TRACKER_FILE):
        with open(PROCESSED_TRACKER_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_processed_article(article_hash):
    """Saves a new article hash to the processed tracker to prevent duplicate runs."""
    processed = load_processed_articles()
    if article_hash not in processed:
        processed.append(article_hash)
        with open(PROCESSED_TRACKER_FILE, "w", encoding="utf-8") as f:
            json.dump(processed, f, indent=4)

def run_app():
    print("="*60)
    print(" SN&P PORTFOLIO RISK ENGINE - MAIN PIPELINE ")
    print("="*60)
    
    # 1. Initialize Models
    print("Loading Models into Memory...")
    finbert = SentimentAnalyzer()
    qwen = QwenValidator()
    ingestor = DataIngestor()
    
    # 2. Ask User for Input Source
    choice = ""
    while choice not in ["1", "2"]:
        print("\nSelect Data Source for News:")
        print("[1] Load dataset from local CSV (e.g. self_label.csv, newsdata_labelled_v2.csv)")
        print("[2] Fetch Live News from NewsAPI")
        choice = input("Enter choice (1 or 2, or 'q' to quit): ").strip()
        if choice.lower() == 'q':
            print("Exiting.")
            return
        if choice not in ["1", "2"]:
            print("[!] Invalid choice. Please enter 1 or 2.")
    
    articles_to_process = []
    
    if choice == "1":
        default_csv = "../dataset/newsdata_labelled_v2.csv"
        df = None
        while df is None:
            raw_path = input(f"\nEnter CSV dataset path [Default: {default_csv}]: ").strip()
            clean_path = raw_path.strip('"\'')
            csv_path = clean_path if clean_path else default_csv
            
            if csv_path.lower() == 'q':
                print("Exiting.")
                return
                
            if not os.path.exists(csv_path):
                print(f"[!] File not found: '{csv_path}'")
                print("    Please check the filename/spelling and try again (or press Enter for default, 'q' to quit).")
                continue
                
            df = ingestor.ingest_csv(csv_path)
            if df is None or df.empty:
                print(f"[!] Could not load valid rows from '{csv_path}'. Please try another file.")
                df = None
                continue
                
            # Auto-detect headline or text column
            candidate_cols = ['headline', 'Headline', 'title', 'Title', 'text', 'Text', 'news', 'News', 'article', 'Article']
            text_col = next((c for c in candidate_cols if c in df.columns), None)
            if not text_col:
                text_col = df.columns[0]
                print(f"Notice: Using column '{text_col}' for article text.")
            else:
                print(f"Using column '{text_col}' for article text.")
                
            articles_to_process = df[text_col].dropna().astype(str).tolist()
            if not articles_to_process:
                print(f"[!] Column '{text_col}' has no valid text entries. Please try another file.")
                df = None
                continue
            
            # Shuffling option
            do_shuffle = input("\nShuffle dataset? (y/n, default: y): ").strip().lower()
            if do_shuffle != 'n':
                random.shuffle(articles_to_process)
                print("Dataset shuffled successfully.")
                
            # Optional sample limit
            limit_input = input(f"How many articles to process? (Enter for all {len(articles_to_process)}): ").strip()
            if limit_input.isdigit() and int(limit_input) > 0:
                articles_to_process = articles_to_process[:int(limit_input)]
                print(f"Processing {len(articles_to_process)} articles from selection.")
    elif choice == "2":
        query = input("Enter live search query (e.g., 'Apple', 'Finance', 'Federal Reserve'): ").strip()
        
        print("\n[NOTE] NewsAPI free tier delays news by 24 hours. You cannot fetch today's news.")
        from_date = input("Enter a past date (YYYY-MM-DD) from the last 7 days: ").strip()
            
        articles = ingestor.fetch_news_api(query=query, from_date=from_date)
        if articles:
            # Extract just the titles from the API JSON response
            articles_to_process = [article.get('title', '') for article in articles if article.get('title')]

    if not articles_to_process:
        print("No articles found to process. Exiting.")
        return

    # Create CSV Headers if it doesn't exist
    if not os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Headline", "Ticker", "FinBERT_Score", "Qwen_Score", "Impact_Score", "Final_Multiplier"])

    print(f"\nFound {len(articles_to_process)} articles. Starting Sequential Analysis...")
    
    # 3. Process Articles in a Loop
    processed_list = load_processed_articles()
    
    try:
        for i, article_text in enumerate(articles_to_process):
            # Create a deterministic unique ID/Hash for the article text so we can track it across sessions
            article_hash = hashlib.md5(article_text.encode('utf-8')).hexdigest()
            
            # Check if we already evaluated this exact article previously
            if article_hash in processed_list:
                print(f"\n[SKIP] Already processed previously: {article_text[:50]}...")
                continue
                
            print("\n" + "-"*60)
            print(f"PROCESSING ARTICLE {i+1}: {article_text}")
            print("-"*60)
            
            # Phase 1: FinBERT
            finbert_score = finbert.analyze_text(article_text)
            print(f"[FinBERT Score]: {finbert_score}")
            
            # Phase 2: Qwen JSON Extraction
            qwen_json = qwen.analyze_article(article_text)
            
            # Hybrid Entity & Ticker Resolution (Qwen + Text-matching fallback)
            raw_company = str(qwen_json.get('company_name', 'Unknown')).strip().upper()
            resolved_company, resolved_ticker = resolve_company_and_ticker(raw_company, article_text)
            
            # Inject resolved company and ticker back into the JSON
            qwen_json['company_name'] = resolved_company
            qwen_json['ticker'] = resolved_ticker
            
            print(f"[Qwen Extraction]: Company: '{resolved_company}' -> Ticker: {resolved_ticker}, Sentiment: {qwen_json.get('sentiment_score')}, Impact: {qwen_json.get('impact_score')}/10")
            
            # Phase 3: Validation
            validation = qwen.validate_results(qwen_json, finbert_score)
            
            # Phase 4: Decision Engine (Directional Consensus & Override Strategy)
            final_sentiment = 0.0
            
            try:
                qwen_sentiment = float(qwen_json.get('sentiment_score', 0.0))
            except (ValueError, TypeError):
                qwen_sentiment = 0.0
                
            impact = qwen_json.get("impact_score", 0)
            try:
                impact = int(impact)
            except (ValueError, TypeError):
                impact = 0

            # 1. Directional Agreement Check
            both_positive = finbert_score > 0.15 and qwen_sentiment > 0.15
            both_negative = finbert_score < -0.15 and qwen_sentiment < -0.15
            both_neutral = abs(finbert_score) <= 0.15 and abs(qwen_sentiment) <= 0.15
            
            if both_positive or both_negative:
                print(">> [Logic]: Models agree on sentiment direction. Blending FinBERT + Qwen scores.")
                final_sentiment = round(0.6 * finbert_score + 0.4 * qwen_sentiment, 2)
            elif both_neutral:
                print(">> [Logic]: Models agree article is neutral.")
                final_sentiment = 0.0
            else:
                # Directional conflict or one model strongly disagreed
                override_threshold = 6 if (abs(finbert_score) <= 0.15 or abs(qwen_sentiment) <= 0.15) else 7
                if impact >= override_threshold:
                    print(f">> [Logic]: Models disagree, BUT Qwen impact is HIGH ({impact}/10 >= {override_threshold}). Overriding FinBERT with Qwen!")
                    final_sentiment = qwen_sentiment
                else:
                    print(f">> [Logic]: Models disagree and Qwen impact is LOW ({impact}/10 < {override_threshold}). Safely ignoring article.")
                    final_sentiment = 0.0
                    
            # SAFETY CHECK: If entity is untradable, equity trade multiplier is 0.0
            ticker = qwen_json.get('ticker', 'UNTRADABLE')
            final_multiplier = final_sentiment
            if not ticker or str(ticker).strip().upper() in ['N/A', 'NONE', 'UNKNOWN', 'NULL', '', 'UNTRADABLE']:
                print(f">> [Safety Guard]: Entity not in Tradable Universe ('{ticker}'). Forcing Rebalance Multiplier to 0.0!")
                final_multiplier = 0.0
            else:
                print(f">>> FINAL PORTFOLIO REBALANCE MULTIPLIER: {final_multiplier} ({ticker}) <<<")
            
            # Save results to the CSV
            with open(RESULTS_FILE, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    article_text,
                    ticker,
                    finbert_score,
                    qwen_sentiment,
                    impact,
                    final_multiplier
                ])
            print(f"[!] Saved decision to {RESULTS_FILE}")
            
            # Save to processed tracking list so we don't evaluate it again in the future
            save_processed_article(article_hash)
            
    except KeyboardInterrupt:
        print("\n\n[!] Execution paused by user (Ctrl+C). All decisions were saved successfully.")

if __name__ == "__main__":
    run_app()
