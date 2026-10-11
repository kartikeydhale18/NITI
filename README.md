# NITI // Autonomous Portfolio Risk & Tactical Rebalancing Engine

[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-blue?style=for-the-badge&logo=fastapi)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-orange?style=for-the-badge&logo=react)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/frontend)
[![AI Models](https://img.shields.io/badge/AI%20Models-FinBERT%20%2B%20Qwen2.5--1.5B-gold?style=for-the-badge&logo=huggingface)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend/sentiment_analyzer)
[![Database](https://img.shields.io/badge/Database-SQLite3%20%2B%20CSV%20Mirror-green?style=for-the-badge&logo=sqlite)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend/portfolio.db)

An institutional-grade, full-stack AI Financial Risk Engine built for tactical equity portfolio rebalancing. The system ingests streaming or simulated breaking financial news, executes a **dual-model verification pipeline** combining specialized financial sentiment (**ProsusAI FinBERT**) and causal reasoning (**Qwen2.5-1.5B-Instruct**), resolves entities to tradable tickers, and autonomously adjusts portfolio weights with mathematical capital conservation.

---

## ⚡ Key Highlights & Architecture

### 1. Dual-AI Consensus & Override Decision Engine
- **Model 1 (FinBERT)**: Evaluates quantitative market tone (`-1.0` to `+1.0`).
- **Model 2 (Qwen2.5-1.5B-Instruct)**: Extracts canonical JSON metadata (`company_name`, `sentiment_score`, `impact_score` out of 10, `event_type`, and analytical `rationale`).
- **Hybrid Entity & Ticker Resolution**: Cross-checks extracted corporate entities against a universe of 150+ equities, resolving tickers (e.g. `AAPL`, `SPY`, `MSFT`) and filtering out non-commercial entities.
- **Directional Consensus**:
  - **Both Positive or Both Negative**: Blends scores via a weighted consensus formula: `0.60 * FinBERT + 0.40 * Qwen`.
  - **Conflict / Disagreement**: If Qwen assesses the news impact as high severity ($\ge 6/10$), Qwen's contextual causal reasoning overrides FinBERT. Otherwise, the noise is filtered out (`0.0`).

### 2. Tactical Portfolio Rebalancing Engine (`backend/rebalancer`)
- **$100,000 Capital Conservation**: All weight adjustments strictly mirror against the `CASH` reserve to preserve a 100% total allocation at all times.
- **PRD Risk Guardrails**:
  - **Max Event Step**: Single news events cannot shift a stock's weight by more than **5.0 percentage points**.
  - **Min Stock Floor**: 2.0% minimum allocation.
  - **Max Stock Ceiling**: 15.0% maximum allocation.
  - **Cash Floor**: Minimum 2.0% reserve maintained.
- **Dual Persistence**: Every transaction is committed to `portfolio.db` (SQLite) and mirrored to human-readable `current_portfolio.csv` and `portfolio_decisions.csv`.

### 3. Web3 Dark Terminal Frontend (`frontend/`)
- Built with **React 19** and **Vite**, styled in a curated Web3 dark aesthetic:
  - Deep Onyx Void (`#070709`) background with luminous Bitcoin Amber (`#f7931a`) and Neon Green/Crimson telemetry accents.
  - Glassmorphic panels with frosted borders and radial glows.
  - **Segmented 3-Tab Architecture**:
    - **Tab 1: Portfolio & Allocation**: Real-time Hero KPIs (including Current Cash Reserve), Holdings Matrix, and interactive SVG Donut Topology Wheel.
    - **Tab 2: News Feed & Simulation**: Ingest news from Local CSV Datasets (`/dataset`) or Live NewsAPI, persist with SQLite deduplication, evaluate with Dual-AI models, track article status (`PENDING` vs `ANALYZED`), and protect against duplicate trades.
    - **Tab 3: Audit Ledger**: Chronological transaction history log with search filtering, timestamps, weight deltas, and triggering headlines.
  - **Storage Optimization & Guardrails**:
    - Automatic headline deduplication (`UNIQUE` index) prevents database bloat.
    - Duplicate evaluation blocker prevents double-rebalancing on already analyzed news.
    - "Clear Pending" prune button to immediately purge unanalyzed headlines while preserving analyzed history.

---

## 🚀 Quickstart Guide for Judges

### Prerequisites
- Python 3.10+ (with virtual environment)
- Node.js v18+ and npm

---

### Step 1: Start the FastAPI Backend

Open a terminal in the project root:

```powershell
# 1. Activate the Python virtual environment
.\.venv\Scripts\Activate.ps1

# 2. Install backend dependencies (if not already installed)
pip install -r requirements.txt

# 3. Launch the FastAPI server
uvicorn backend.api:app --reload --host 127.0.0.1 --port 8000
```

> **API Swagger Docs**: Once started, interactive API documentation is available at `http://127.0.0.1:8000/docs`.

---

### Step 2: Start the React Frontend

Open a second terminal in the project root:

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Launch the Vite development server
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🖥️ Interactive Demo Flow for Judges

1. **Observe Real-Time Telemetry (Tab 1: Portfolio & Allocation)**:
   - Check the **Top Navigation Bar**: The green pill `● BACKEND LIVE (FASTAPI)` confirms real-time communication between React and Python.
   - Inspect the **4 Hero Metric Cards**: View the `$100,000.00` total fund, `$12,000.00` current liquid cash reserves, equity exposure, and active asset count.
   - Review the **Asset Allocation Matrix & Donut Wheel**: See monitored equities and cash holding, respecting the 2% floor and 15% maximum cap.
2. **Ingest News & Run Rebalancing (Tab 2: News Feed & Simulation)**:
   - Switch to the **News Feed & Simulation** tab.
   - Click **"📥 Fetch News from CSV"** (or use Live NewsAPI): Articles load into SQLite with `● PENDING` status badges.
   - Click **"⚡ Analyze with Dual-AI"** on any article:
     - Watch FinBERT and Qwen2.5 evaluate the news in real time.
     - The article status updates to `✓ ANALYZED (+0.80)`.
     - The action button locks to `✓ Rebalanced` to strictly prevent duplicate rebalancing.
   - Use the **Filter Chips** (`All`, `Pending`, `Analyzed`) to filter the ingested feed.
   - Use **"🗑 Clear Pending"** to prune unanalyzed rows and keep SQLite storage minimal.
3. **Inspect the Audit Ledger (Tab 3: Audit Ledger)**:
   - Switch to the **Audit Ledger** tab to review the recorded trade event with exact before/after weight transitions, cash reserve adjustments, and timestamp.
4. **Reset Anytime**:
   - Click the **Reset Portfolio** button in the top navigation bar to restore the database to the starting $100,000 baseline state.

---

## 📁 Repository Structure

```text
SnP/
├── backend/
│   ├── api.py                          # FastAPI REST API Bridge
│   ├── app.py                          # Autonomous Pipeline & CLI Runner
│   ├── portfolio.db                    # SQLite Database (portfolio, rebalance_history, decisions)
│   ├── current_portfolio.csv           # Human-readable mirrored portfolio state
│   ├── portfolio_decisions.csv         # Article AI decision logs
│   ├── schema.sql                      # Initial SQLite schema & weights
│   ├── setup_db.py                     # Database reset & migration utility
│   ├── tickers.json                    # Universe of 150+ equity tickers
│   ├── data_ingestion/
│   │   └── data_ingestion.py           # NewsAPI & CSV data loader
│   ├── sentiment_analyzer/
│   │   ├── sentiment_analysis.py       # ProsusAI FinBERT Analyzer
│   │   └── validator_llm.py            # Qwen2.5-1.5B Instruct Reasoning & Judge
│   └── rebalancer/
│       └── portfolio_manager.py        # Tactical Portfolio Rebalancing Engine
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Brand header, status pills, reset button
│   │   │   ├── HeroMetrics.jsx         # 4 Telemetry KPI cards
│   │   │   ├── PortfolioMatrix.jsx     # Asset allocation table & progress meters
│   │   │   ├── VisualizerDonut.jsx     # Glowing SVG Donut Topology Wheel
│   │   │   ├── SimulationLab.jsx       # "What-If" News Scenario Sandbox
│   │   │   └── AuditLedger.jsx         # Chronological trade history log
│   │   ├── App.jsx                     # State coordination & API hooks
│   │   └── index.css                   # Web3 dark theme tokens & styling
│   ├── index.html                      # Entry HTML with Google Fonts
│   └── package.json                    # React & Vite dependencies
├── requirements.txt                    # Python dependencies
└── README.md                           # Documentation
```
