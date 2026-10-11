# Presentation Deck: NITI // Autonomous Portfolio Risk & Tactical Rebalancing Engine

**Candidate**: Kartikey A. Dhale  
**College**: College of Engineering Pune (COEP Technological University)  
**Track**: Applied Artificial Intelligence & Quantitative Finance  

---

## Slide 1: Title Slide

### Visual Layout:
- **Header**: NITI — Autonomous Portfolio Risk & Tactical Rebalancing Engine
- **Tagline**: Institutional-Grade Dual-AI Quantitative Consensus Pipeline & Capital-Preserving Execution Engine
- **Presenter**: Kartikey A. Dhale
- **Institution**: College of Engineering Pune (COEP Technological University)
- **Tech Stack Badges**: `Python 3.12` • `FastAPI` • `React 19 + Vite` • `FinBERT` • `Qwen2.5-1.5B` • `SQLite3`

---

## Slide 2: Problem & Approach

### 1. The Business Problem
- **Information Asymmetry & Velocity**: Thousands of financial news items, earnings reports, and macro indicators are published daily. Human fund managers cannot digest and act upon this stream in real-time.
- **Failure of Naive Sentiment Models**: 
  - Off-the-shelf sentiment models (e.g., standard VADER or basic classifiers) lack causal reasoning and misclassify complex corporate investments as negative costs.
  - Pure Large Language Models (LLMs) used alone are slow, prone to hallucination, and produce non-deterministic numeric outputs that cannot be trusted with capital.
- **Uncontrolled Capital Risk**: Naive automated trading lacks mathematical risk constraints, resulting in severe over-concentration, portfolio drift, or catastrophic cash depletion.

### 2. The Solution Approach (NITI Framework)
- **Dual-AI Verification Pipeline**: Pairs a domain-specific financial sentiment classifier (**ProsusAI FinBERT**) with an analytical causal reasoning LLM (**Qwen2.5-1.5B-Instruct**) for cross-model consensus.
- **Consensus & High-Impact Override Matrix**: Blends agreeing signals (60/40 weighted blend), filters out ambiguous market noise (setting multiplier to `0.0`), and triggers high-impact overrides only on extreme, high-conviction catalysts ($\ge 7/10$ impact).
- **Strict Mathematical Guardrails**: Rebalances equity weights dynamically against a dedicated `CASH` reserve with:
  - Exact **$100,000.00** total capital conservation ($100\%$ sum invariant).
  - Strict **15.00%** maximum equity cap.
  - Hard **2.00%** equity floor and **2.00%** cash liquidity buffer.
- **Enterprise Web3 Terminal**: Full-stack observability cockpit built with React 19, FastAPI, and ACID-compliant SQLite storage.

---

## Slide 3: System Design & Architecture

```
[ Financial News: CSV / What-If / Upload ]
                    │
                    ▼
   ┌──────────────────────────────────┐
   │    Two-Tier AI Consensus Engine   │
   │  ┌────────────┐  ┌─────────────┐ │
   │  │  FinBERT   │  │  Qwen 2.5   │ │
   │  │ Micro-Tone │  │ Causal LLM  │ │
   │  └─────┬──────┘  └──────┬──────┘ │
   │        └────────┬───────┘        │
   │                 ▼                │
   │      Consensus & Arbitration     │
   │     (High-Impact AI Override)    │
   └─────────────────┬────────────────┘
                     │  Directional Multiplier (-1.0 to +1.0)
                     ▼
   ┌──────────────────────────────────┐
   │   Quantitative Rebalancer Engine  │
   │   • $100,000 Capital Conservation│
   │   • Max 15.0% Single-Asset Cap   │
   │   • Min 2.0% Position Floor      │
   │   • Min 2.0% Cash Reserve Buffer │
   └─────────────────┬────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   ┌───────────────┐     ┌──────────────┐
   │ SQLite DB     │     │ Mirrored CSV │
   │ Audit Ledger  │     │ Storage      │
   └───────────────┘     └──────────────┘
```

---

## Slide 4: Dual-Model Consensus & Arbitration

- **ProsusAI FinBERT**: Fast, lightweight domain transformer producing continuous sentiment polarity `[-1.0, +1.0]`.
- **Qwen 2.5 1.5B Instruct**: Extracts structured JSON assessing entity ticker, event type, causal impact severity `1-10`, and financial rationale.
- **Arbitration Logic**:
  - Both positive / negative: Weighted consensus: `0.60 * FinBERT + 0.40 * Qwen`.
  - High Impact ($\ge 7/10$, $|sentiment| \ge 0.45$): Qwen overrides.
  - Mild Conflict / Noise: Dampens multiplier to `0.0` (preserves cash, zero churn).

---

## Slide 5: Mathematical Rebalancing & Risk Invariants

- **The Capital Invariant**:
  $$\sum_{i=1}^{N} W_i + W_{\text{CASH}} = 100.00\% = \$100,000.00$$
- **Ceiling Constraint**: $W_i \le 15.00\%$
- **Floor Constraint**: $W_i \ge 2.00\%$
- **Cash Buffer**: $W_{\text{CASH}} \ge 2.00\%$
- **Dynamic Cash Reservoir**: Sales pump capital into Cash; Purchases draw from Cash.

---

## Slide 6: Enterprise Web3 Terminal & Auditability

- **React 19 + Vite Dashboard**: Dark Web3 terminal aesthetic (`#070709` void black, `#f7931a` amber).
- **Interactive SVG Topology Donut Wheel**: Live visualizer of asset weights and cash reserves.
- **3 Ingestion Channels**: Curated CSVs, Custom CSV upload, and Manual "What-If" sandbox.
- **Immutable SQLite Audit Trail**: Permanent ledger recording timestamp, previous weight, new weight, delta, and rationale.

---

## Slide 7: Production Readiness, EC2 Deployment & Conclusion

- **Production Deployment**: 1-command automated bash script (`deploy_ec2.sh`) on AWS EC2 Ubuntu 24.04 with Nginx reverse proxy and systemd service.
- **Docker Orchestration**: Multi-stage `Dockerfile` and `docker-compose.yml`.
- **Summary**: NITI bridges the gap between chaotic real-time news and disciplined quantitative capital management.
