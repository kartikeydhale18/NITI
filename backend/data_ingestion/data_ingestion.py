import pandas as pd
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

class DataIngestor:
    def __init__(self, news_api_key=None):
        self.news_api_key = news_api_key or os.environ.get("NEWS_API_KEY")

    def ingest_csv(self, file_path):
        """
        Reads a CSV file containing financial news data.
        Expected format: datetime, headline, ticker, sentiment
        """
        # Clean any surrounding quotes that might have been pasted
        file_path = str(file_path).strip('"\'')
        
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' does not exist.")
            return None

        print(f"Loading data from {file_path}...")
        for enc in ['utf-8', 'utf-8-sig', 'cp1252', 'latin1']:
            try:
                df = pd.read_csv(file_path, encoding=enc)
                print(f"Successfully loaded {len(df)} records with encoding '{enc}'.")
                return df
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"Error loading CSV with {enc}: {e}")
                return None
        print(f"Error: Could not decode {file_path} with standard encodings.")
        return None

    def fetch_news_api(self, query, from_date=None, to_date=None):
        """
        Fetches news articles from NewsAPI (newsapi.org).
        """
        if not self.news_api_key:
            print("Error: NEWS_API_KEY is not set.")
            return None
        max_days_back = 10
        oldest_allowed_date = datetime.now() - timedelta(days=max_days_back)
        
        if from_date:
            requested_date = datetime.strptime(from_date, "%Y-%m-%d")
            if requested_date < oldest_allowed_date:
                safe_date = oldest_allowed_date.strftime("%Y-%m-%d")
                print(f" Warning: Requested date {from_date} is too old. Auto-adjusting to {safe_date} to prevent API errors.")
                from_date = safe_date

        print(f"Fetching news for '{query}'...")
        url = "https://newsapi.org/v2/everything"
        
        params = {
            'q': query,
            'apiKey': self.news_api_key,
            'language': 'en'
        }
        
        if from_date:
            params['from'] = from_date
        if to_date:
            params['to'] = to_date

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            articles = data.get('articles', [])
            print(f"Successfully fetched {len(articles)} articles.")
            return articles
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from News API: {e}")
            return None

if __name__ == "__main__":
    # Example usage for CSV
    ingestor = DataIngestor()
    
    # 1. Setup CSV ingestion (using the provided file as an example)
    csv_file_path = "../dataset/newsdata_labelled_v2.csv"
    if os.path.exists(csv_file_path):
        df = ingestor.ingest_csv(csv_file_path)
        if df is not None:
            print(df.head()) # Print only the top 5 rows instead of the whole file
        else:
            print(f" Error: The file {csv_file_path} exists, but Pandas could not read it.")
    else:
        print(f" Error: The dataset file '{csv_file_path}' was not found. Please check the path.")
    
    # 2. Setup NEWS API
    try:
        articles = ingestor.fetch_news_api(query="finance", from_date="2026-10-08")
        
        if articles:
            import json
            with open("temp_news.json", "w", encoding="utf-8") as f:
                json.dump(articles, f, indent=4)
            print(" Successfully saved fetched news to temp_news.json for inspection.")
        else:
            print(" Warning: NewsAPI returned no articles or failed. Check your API key and internet connection.")
            
    except Exception as e:
        print(f" Critical Error during API fetch: {e}")
