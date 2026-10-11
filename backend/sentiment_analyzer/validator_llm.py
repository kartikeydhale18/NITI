import json
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

class QwenValidator:
    def __init__(self):
        print("Loading Qwen2.5-1.5B-Instruct Model...")
        
        self.model_name = "Qwen/Qwen2.5-1.5B-Instruct"

        
        # Load tokenizer and model. We let it auto-detect CPU vs GPU.
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype="auto",    # Automatically uses float16 on GPU, and float32 on CPU!
            device_map="auto"
        )
        print("Qwen Model loaded successfully!")

    def analyze_article(self, text: str) -> dict:
        """
        Step 1: Qwen independently analyzes the article and generates the Canonical JSON.
        """
        system_prompt = "You are a senior financial risk analyst and entity extractor. Always output valid JSON."
        user_prompt = f"""Analyze the financial headline/article and output a JSON object with exactly these keys:
- "company_name": The specific company, ticker, or entity mentioned.
  * RULES:
    1. US Economy vs Foreign Economy:
       - If the headline is about the US economy, Federal Reserve, US GDP/inflation/unemployment, or Wall Street, output "US MACRO" or "S&P 500".
       - If the headline is about a foreign national economy (e.g., Hong Kong, UK, Brazil, Germany, France, Italy, China), output the specific country name (e.g., "Hong Kong", "UK", "Brazil"). DO NOT classify foreign economies as S&P 500 or US Macro!
    2. Company Extraction:
       - Only output a company name if that company or brand is EXPLICITLY mentioned in the text (e.g., Google, Intel, Microsoft, Facebook).
       - NEVER guess or hallucinate corporate owners for fires, shipwrecks, or accidents if no company is named.
    3. If a private entity challenges or partners with a public company (e.g., TikTok challenges Facebook), output the public company ("Facebook").
    4. Only output "None" if the article is purely non-financial (e.g., royal protocol, entertainment celebrity gossip, sports).
- "sentiment_score": Float between -1.0 (bearish/negative) and +1.0 (bullish/positive).
  * CRITICAL: Score the real financial/economic tone honestly! (e.g. losses, shortages, inflation, fines, or lockdowns = -0.5 to -1.0; growth, investment boom, or jobs bounce = +0.5 to +1.0).
- "event_type": News category (e.g., US Macro, Foreign Economy, Regulatory, Supply Chain, Earnings).
- "impact_score": Integer from 1 to 10 based on market risk/importance.
- "rationale": Short explanation.

Examples:
Article: "US economy expanded by 6.4% in first quarter, pointing to fastest growth in years"
JSON: {{"company_name": "US MACRO", "sentiment_score": 0.9, "event_type": "US Macro", "impact_score": 8, "rationale": "Fastest US economic expansion in years boosts domestic market outlook"}}

Article: "Hong Kong ends longest recession in decades"
JSON: {{"company_name": "Hong Kong", "sentiment_score": 0.9, "event_type": "Foreign Economy", "impact_score": 7, "rationale": "Hong Kong economy stages strong recovery out of recession"}}

Article: "Coronavirus: Fed’s Beige Book finds labour shortages weighing on businesses ."
JSON: {{"company_name": "US MACRO", "sentiment_score": -0.8, "event_type": "US Macro", "impact_score": 7, "rationale": "US Federal Reserve survey reports acute labour shortages constraining businesses"}}

Article: "Sri Lanka faces ecological disaster as burning container ship starts to sink."
JSON: {{"company_name": "None", "sentiment_score": -0.8, "event_type": "Disaster", "impact_score": 6, "rationale": "Maritime environmental disaster with no public commercial company mentioned"}}

Article: "France fines Google 220m for antitrust abuse in advertising."
JSON: {{"company_name": "Google", "sentiment_score": -0.7, "event_type": "Regulatory", "impact_score": 7, "rationale": "Antitrust fine penalties against Google ad dominance"}}

Article: "TikTok begins testing in-app shopping to challenge Facebook"
JSON: {{"company_name": "Facebook", "sentiment_score": -0.3, "event_type": "Competition", "impact_score": 6, "rationale": "TikTok threatens Facebook ad and e-commerce market share"}}

Article: "{text}"
JSON:"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        text_input = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([text_input], return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(**inputs, max_new_tokens=200, temperature=0.1)
        response = self.tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        
        try:
            # Clean up the output in case it wraps it in markdown code blocks
            clean_json = response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Failed to parse Qwen JSON: {e}")
            return {"error": "Invalid JSON", "raw_response": response}

    def validate_results(self, qwen_result: dict, finbert_score: float) -> dict:
        """
        Step 2: Qwen acts as the judge between its own result and FinBERT's result.
        """
        qwen_score = qwen_result.get("sentiment_score", "Unknown")
        
        system_prompt = "You are a senior financial validator. Always output valid JSON."
        user_prompt = f"""We have two sentiment scores for the same financial article.
Model 1 (Qwen) Sentiment: {qwen_score}
Model 2 (FinBERT) Sentiment: {finbert_score}

Analyze these two scores. Are they in agreement, or is there a major disagreement? If there is a major disagreement, we need to flag it for human review.
Output a JSON object containing exactly these keys:
"requires_review": true or false
"reason": "Explain why they agree or disagree, and why review is or isn't needed."
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        text_input = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([text_input], return_tensors="pt").to(self.model.device)
        
        outputs = self.model.generate(**inputs, max_new_tokens=150, temperature=0.1)
        response = self.tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        
        try:
            clean_json = response.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_json)
        except Exception as e:
            return {"requires_review": True, "reason": "Failed to parse judge output. Defaulting to review required."}

if __name__ == "__main__":
    # Test script
    qwen = QwenValidator()
    
    test_article = "Bank of America Reaffirms Underperform Rating for MERCK KGAA/S $MKKGY  #stocks"
    finbert_test_score = 0.58 # Hardcoded mistake from FinBERT
    
    print("\n--- Step 1: Qwen Independent Analysis ---")
    qwen_output = qwen.analyze_article(test_article)
    print(json.dumps(qwen_output, indent=2))
    
    print("\n--- Step 2: Qwen Evaluates Both Models ---")
    validation = qwen.validate_results(qwen_output, finbert_test_score)
    print(json.dumps(validation, indent=2))
