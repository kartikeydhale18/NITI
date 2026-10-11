# NITI // Autonomous Portfolio Risk & Tactical Rebalancing Engine

[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.10%2B-blue?style=for-the-badge&logo=fastapi)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite-orange?style=for-the-badge&logo=react)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/frontend)
[![AI Consensus](https://img.shields.io/badge/AI%20Pipeline-FinBERT%20%2B%20Qwen2.5-gold?style=for-the-badge&logo=huggingface)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend/sentiment_analyzer)
[![Database](https://img.shields.io/badge/Storage-SQLite3%20%2B%20CSV%20Audit-green?style=for-the-badge&logo=sqlite)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/backend/portfolio.db)
[![Deployment](https://img.shields.io/badge/Deployment-AWS%20EC2%20%7C%20Docker-purple?style=for-the-badge&logo=amazon-aws)](file:///e:/Kartikey%20A%20Dhale/Projects/SnP/deploy_ec2.sh)

**Author:** Kartikey A. Dhale  
**Institution:** College of Engineering Pune (COEP) Technological University  

---

## 📌 Executive Summary

**NITI** is an institutional-grade, full-stack **Autonomous Portfolio Risk & Tactical Rebalancing Engine** designed to transform unstructured, breaking financial news into disciplined, mathematically guarded equity rebalancing decisions.

Traditional algorithmic sentiment engines (such as VADER or simple RoBERTa) fail in financial markets because they lack financial context and causal reasoning—often misinterpreting major R&D investments, AI breakthrough models, or corporate expansion announcements as negative expenditure overruns.

To solve this, NITI implements a **Two-Tier AI Consensus Architecture**:
1. **Tier 1 (ProsusAI FinBERT)**: Fine-tuned on financial phrasebanks for micro-level market tone and directional polarity (`-1.0` to `+1.0`).
2. **Tier 2 (Qwen 2.5 Causal Validator)**: Analyzes the macroeconomic and operational causality behind market news, extracting corporate entities, impact severity (`1-10`), and financial rationale.
3. **Deterministic Quantitative Guardrails**: Rebalancing signals do not trade unconstrained. All allocations are strictly governed by **four deterministic mathematical invariants**, ensuring capital conservation and risk mitigation.

---

## ⚙️ Core Architecture & Safeguards

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

### 1. Dual-Model AI Consensus & High-Impact Override
- **Agreement**: If both models agree (e.g. positive earnings and strong guidance), their signals are combined into an amplified conviction score.
- **High-Impact Breakthroughs**: If an event carries high operational significance (Impact $\ge 7/10$, $|sentiment| \ge 0.45$), Qwen's causal reasoning takes precedence over micro-level text classifiers.
- **Mild Disagreement**: If signals diverge without high conviction, the rebalancer safely neutralizes the signal to `0.0`, preventing costly transaction churn.

### 2. The 4 Mathematical Risk Invariants
- **Strict Capital Conservation Invariant**: Total portfolio value is mathematically locked at exactly **$100,000.00**. No phantom leverage or capital decay.
- **15.0% Single-Asset Ceiling**: No individual equity can ever exceed 15% of the total fund, preventing catastrophic concentration risk.
- **2.0% Position Floor**: Core equities maintain a baseline 2.0% allocation unless explicitly closed.
- **Dynamic Cash Reserve Buffer**: A minimum **2.0% liquid cash buffer** is preserved at all times. Bearish trims liquidate directly into cash; bullish expansions draw from cash.

### 3. Regulatory Dual Storage & Auditability
- Every trade is permanently recorded in an immutable **SQLite database** (`backend/portfolio.db`) with full timestamps, old weights, new weights, deltas, and triggering headlines.
- State is continuously mirrored to human-readable CSVs (`backend/current_portfolio.csv` and `backend/portfolio_decisions.csv`).

---

## ⚠️ Important Note for Evaluators / Judges

> [!IMPORTANT]
> **No NewsAPI key is required or provided out-of-the-box.**  
> The free developer tier of NewsAPI blocks real-time news within the last 24 hours behind a paid plan.  
> **Therefore, evaluations must be performed using:**
> 1. **The 3 Curated Evaluation Datasets** (`newsdata_labelled_v2.csv`, `newsdata_labelled_v3.csv`, `self_label.csv`) selectable directly in the dropdown.
> 2. **Upload Custom CSV**: Upload any custom CSV with financial headlines via the web UI.
> 3. **Manual "What-If" Sandbox**: Type custom test headlines or click quick scenario presets (e.g. CEO departures, FDA approvals).

---

## 💻 Local Setup & Execution Guide

Follow these step-by-step instructions to run both the backend and frontend locally on your machine.

### Prerequisites
- **Python 3.10+** (Python 3.10, 3.11, or 3.12)
- **Node.js 18+** (Node.js 18, 20 LTS recommended) & `npm`
- **Git**

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/kartikeydhale18/NITI.git
cd NITI
```

---

### Step 2: Backend Setup (Python FastAPI)

1. **Create and activate a Python virtual environment:**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

2. **Install all Python dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Initialize the SQLite database:**
   ```bash
   python backend/setup_db.py
   ```
   *This creates `backend/portfolio.db` with the initial $100,000 baseline portfolio allocations.*

4. **Start the FastAPI backend server:**
   - **Option A (From the `backend` folder):**
     ```bash
     cd backend
     uvicorn api:app --reload --host 127.0.0.1 --port 8000
     ```
   - **Option B (From project root):**
     ```bash
     uvicorn backend.api:app --reload --host 127.0.0.1 --port 8000
     ```

   *Verify backend is running:* Open `http://127.0.0.1:8000/docs` in your browser to view the interactive FastAPI Swagger API documentation.

---

### Step 3: Frontend Setup (React 19 + Vite)

Open a **new terminal window** in the project root:

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open **`http://localhost:5173`** in your browser.  
   The top navigation bar will display a glowing green **`● API LIVE`** pill, confirming that the React frontend is connected to the FastAPI backend.

---

## 🧪 How to Evaluate & Test the System

### Method 1: Evaluate Using Curated Local Datasets (Recommended)
1. Open the dashboard at `http://localhost:5173`.
2. Click on the **`News Feed & Simulation`** tab.
3. In the **DATASET SELECTOR** dropdown, select any of the 3 pre-packaged evaluation datasets:
   - **`newsdata_labelled_v2.csv`**: Over 10,000 broad financial news headlines.
   - **`newsdata_labelled_v3.csv`**: Multi-sector macroeconomic shocks and earnings announcements.
   - **`self_label.csv`**: Targeted high-conviction market shock scenarios.
4. Set your desired **Article Limit** (e.g., 5, 10, or 20 articles).
5. Click **`📥 Fetch News from CSV`**. Headlines will load into the Ingested News Feed table.
6. Click **`⚡ Analyze & Rebalance`** on individual headlines (or batch analyze):
   - Watch the Dual-AI consensus evaluate the headline in real time.
   - The status updates with the consensus score (e.g., `✓ ANALYZED (+0.80)`).
   - Duplicate rebalancing is automatically locked to protect against double execution.
7. Switch to the **`Audit Ledger`** tab to inspect the timestamped rebalance transaction.
8. Switch to the **`Portfolio & Allocation`** tab to view the updated Capital Allocation Wheel.

### Method 2: Download or Upload Custom Datasets
- **Download Datasets:** In the **News Feed & Simulation** tab, click **`📥 Download CSV`** to download any selected dataset directly to your computer for inspection in Excel or Notepad.
- **Upload Custom Datasets:** Click **`📤 Upload Custom CSV`** to upload your own custom `.csv` dataset (columns: `headline`, optional: `ticker`, `datetime`). The file is validated and immediately ready for ingestion.

### Method 3: Manual "What-If" Scenario Testing
1. In the **News Feed & Simulation** tab, select **Manual Sandbox**.
2. Click any of the quick scenario presets (e.g., *"NVIDIA Unveils Next-Gen AI Superchips"*, *"Intel Pauses Foundry Expansion"*, or *"US Job Growth Beats Forecasts"*).
3. Click **`⚡ Execute Rebalance`** to observe immediate portfolio realignments.

### Method 4: Portfolio Reset
- Click the **`↺ Reset`** button in the top-right header at any time to restore the portfolio to its baseline $100,000 state.

---

## ☁️ Production Cloud Deployment (AWS EC2)

For cloud deployment, an automated 1-command script is provided for Ubuntu 22.04 / 24.04 LTS:

1. **Launch an AWS EC2 instance** (`t3.large`, Ubuntu 24.04, 25 GB SSD).
2. **Open Security Group Inbound ports:** `22` (SSH), `80` (HTTP), `443` (HTTPS).
3. **SSH into the instance and run:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/kartikeydhale18/NITI/main/deploy_ec2.sh -o deploy_ec2.sh && chmod +x deploy_ec2.sh && ./deploy_ec2.sh
   ```
   *This script automatically installs all dependencies, builds the production frontend, configures a `systemd` service for FastAPI, and sets up Nginx reverse proxy on port 80.*

---

## 📁 Repository Directory Structure

```text
NITI/
├── backend/
│   ├── api.py                          # FastAPI REST API & Static File Server
│   ├── app.py                          # Batch Pipeline CLI Runner
│   ├── portfolio.db                    # SQLite Database (holdings, audit history, decisions)
│   ├── current_portfolio.csv           # Mirrored human-readable portfolio allocations
│   ├── portfolio_decisions.csv         # Article AI consensus logs
│   ├── schema.sql                      # Initial SQLite schema & constraints
│   ├── setup_db.py                     # Database initialization script
│   ├── tickers.json                    # Universe of 150+ equity tickers
│   ├── data_ingestion/
│   │   └── data_ingestion.py           # CSV loader & NewsAPI connector
│   ├── sentiment_analyzer/
│   │   ├── sentiment_analysis.py       # ProsusAI FinBERT Micro Analyzer
│   │   └── validator_llm.py            # Qwen 2.5 Causal Reasoning Validator
│   └── rebalancer/
│       └── portfolio_manager.py        # Quantitative Rebalancer Engine (Capital Invariants)
├── dataset/
│   ├── newsdata_labelled_v2.csv        # Evaluation Dataset 1 (~1 MB)
│   ├── newsdata_labelled_v3.csv        # Evaluation Dataset 2 (~982 KB)
│   ├── self_label.csv                  # Evaluation Dataset 3 (~13.5 KB)
│   └── video_demo_15.csv               # 15-headline demonstration dataset
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Header, status badges, reset button
│   │   │   ├── HeroMetrics.jsx         # 4 Telemetry KPI cards ($100k fund, cash, etc.)
│   │   │   ├── PortfolioMatrix.jsx     # Asset allocation matrix with cap meters
│   │   │   ├── VisualizerDonut.jsx     # Interactive SVG Topology Wheel
│   │   │   ├── SimulationLab.jsx       # News Ingestion Hub, CSV controls, Sandbox
│   │   │   └── AuditLedger.jsx         # Immutable trade transaction log
│   │   ├── App.jsx                     # State coordination & API hooks
│   │   └── index.css                   # Web3 dark theme styling tokens
│   ├── index.html                      # Entry HTML
│   └── package.json                    # React dependencies
├── deploy_ec2.sh                       # 1-command AWS EC2 Ubuntu deployment script
├── Dockerfile                          # Multi-stage production container build
├── docker-compose.yml                  # Docker Compose orchestration
├── requirements.txt                    # Python dependencies
└── README.md                           # Comprehensive documentation
```

---

## 📜 License & Acknowledgments

Built for the **Antigravity AI Financial Risk Intelligence Hackathon**.  
Powered by [ProsusAI FinBERT](https://huggingface.co/ProsusAI/finbert), [Qwen 2.5](https://huggingface.co/Qwen), [FastAPI](https://fastapi.tiangolo.com/), and [React](https://react.dev/).
