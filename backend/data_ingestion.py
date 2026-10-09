import pandas as pd
import os
import requests
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
        print(f"Loading data from {file_path}...")
        try:
            df = pd.read_csv(file_path)
            print(f"Successfully loaded {len(df)} records.")
            return df
        except Exception as e:
            print(f"Error loading CSV: {e}")
            return None

    def fetch_news_api(self, query, from_date=None, to_date=None):
        """
        Fetches news articles from NewsAPI (newsapi.org).
        """
        if not self.news_api_key:
            print("Error: NEWS_API_KEY is not set.")
            return None

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
            print(df)
    
    # 2. Setup NEWS API (Requires API key to be set in code or environment variable)
    # articles = ingestor.fetch_news_api(query="finance", from_date="2023-01-01")
    # if articles:
    #     for article in articles[:2]:
    #         print(article['title'])
        # 2. Setup NEWS API
    articles = ingestor.fetch_news_api(query="finance", from_date="2026-10-05")
    
    if articles:
        import json
        with open("temp_news.json", "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=4)
        print("Successfully saved fetched news to temp_news.json for inspection.")