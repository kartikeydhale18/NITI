import pandas as pd
from transformers import pipeline
import torch

class SentimentAnalyzer:
    def __init__(self):
        print("Loading FinBERT Model... (This may take a moment on the first run)")
        # Using ProsusAI/finbert which is specifically trained on financial text.
        # device=0 uses GPU if available, -1 uses CPU.
        device = 0 if torch.cuda.is_available() else -1
        self.analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert", device=device)
        print("FinBERT Model loaded successfully!")

    def analyze_text(self, text: str) -> float:
        """
        Analyzes a single piece of text and returns a float score between -1.0 and 1.0.
        ProsusAI/finbert returns labels: 'positive', 'negative', 'neutral'.
        """
        if not text or not isinstance(text, str):
            return 0.0

        try:
            # We truncate the text to the max length of BERT (512 tokens) to avoid errors
            result = self.analyzer(text, truncation=True, max_length=512)[0]
            label = result['label'].lower()
            score = result['score'] # Confidence score from 0.0 to 1.0

            if label == 'positive':
                return round(score, 2)
            elif label == 'negative':
                return round(-score, 2)
            else:
                return 0.0 # Neutral
        except Exception as e:
            print(f"Error during sentiment analysis: {e}")
            return 0.0

    def process_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Takes the clean 5-column DataFrame and adds a 'sentiment_score' column.
        """
        if df is None or df.empty:
            return df
        
        print(f"Running FinBERT on {len(df)} articles...")
        
        def get_sentiment(row):
            # Combine headline and content to give the model full context
            text_to_analyze = str(row.get('headline', '')) + ". " + str(row.get('content', ''))
            return self.analyze_text(text_to_analyze)

        # Apply the sentiment function to each row
        df['sentiment_score'] = df.apply(get_sentiment, axis=1)
        print("Sentiment Analysis complete.")
        return df

if __name__ == "__main__":
    # Quick test to ensure FinBERT is working correctly
    analyzer = SentimentAnalyzer()
    
    test_texts = [
        "JPMorgan Chase & Co. Increases Mcdonald¡¦s $MCD Price Target to $215.00  #stocks",
        "Insider Selling: American Express $AXP EVP Sells 2,444 Shares of Stock ",
        "Bank of America Reaffirms Underperform Rating for MERCK KGAA/S $MKKGY  #stocks"
    ]
    
    print("\n--- Testing FinBERT ---")
    for text in test_texts:
        score = analyzer.analyze_text(text)
        print(f"Score: {score: >5} | Text: {text}")
