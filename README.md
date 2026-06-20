# VoiceCare AI Lead Personalisation Console

An autonomous, 7-stage agentic pipeline and interactive control console designed to discover, qualify, enrich, and draft personalized outreach campaigns for healthcare practice managers, billing operations, and revenue cycle management (RCM) leaders.

Built with a modern FastAPI backend, a dynamic dark-mode canvas dashboard, and an automated scheduler integrated with Resend.

---

## 🛠️ Architecture & Pipeline Flow

The agent runs all stages server-side, protecting API keys and enforcing strict data-handling policies. Every lead traverses the following workflow:

```mermaid
flowchart TD
    CRON[Hourly Vercel Cron checks schedule] --> RUN[POST /api/run-pipeline]
    MANUAL[Operator clicks Run Pipeline Now] --> RUN

    RUN --> S1[Stage 01: Discover]
    S1 --> CAND[Candidate list: role-matched prospects]
    CAND --> DEDUP{Already surfaced in 45-day lookback?}
    DEDUP -->|Yes| DROP[Drop candidate]
    DEDUP -->|No| S2[Stage 02: Qualify]

    S2 --> RANK[Ranked candidates]
    RANK --> PICK[Select top 5]
    PICK --> S3[Stage 03: Research]

    S3 --> S4[Stage 04: Signals]
    S4 --> SIGCHK{Verifiable signal with source URL found?}
    SIGCHK -->|No| FLAG[Mark needs_manual_research, backfill reserve]
    FLAG --> PICK
    SIGCHK -->|Yes| S5[Stage 05: Solutions]

    S5 --> S6[Stage 06: Outreach]
    S6 --> S7[Stage 07: Quality]
    S7 --> PASS{Passes compliance & safety audit?}
    PASS -->|No| RETRY[Send back to Stage 06, max 2 retries]
    RETRY --> S6
    PASS -->|Yes| STORE[Write dossier to db.json]

    STORE --> PACK[Assemble Daily Campaign Pack]
    PACK --> UI[Render interactive review cards]
    UI --> HUMAN[Human edits/approves & copy-pastes messages]
```

### The 7-Stage Pipeline Details
1. **Discover**: Searches LinkedIn Sales Navigator or public registries for role-matched professionals in target specialties.
2. **Qualify**: Scores candidates (0–100) based on role fit, company profile, RCM complexity, and signal quality.
3. **Research**: Performs deep searches on clinic websites, team pages, and career portals to discover operational context.
4. **Signals**: Extracts specific, verifiable, dated triggers (e.g. job promotions, clinic expansions, hiring posts).
5. **Solutions**: Maps the lead's pain points to specific VoiceCare AI use-cases (e.g. automating eligibility, reducing payer hold times).
6. **Outreach**: Drafts tailored copy: LinkedIn connect note, sequence follow-ups, and a cold email.
7. **Quality**: Audits drafts against rules (no fake familiarity, no fabricated ROI claims, low-pressure CTAs).

---

## ⚡ Key Features

* **Interactive Figma-like Canvas**: Click and drag to pan, use `Ctrl / Cmd + Scroll` to zoom in/out relative to the cursor, and watch real-time simulated runs visualised stage-by-stage.
* **Dynamic Automated Outreach Scheduler**: Enable automated runs directly from the UI. Select frequency (Daily, Alternate Days, Weekly), choose your preferred time, and input your email to automatically receive HTML summary reports.
* **Resend HTML Reports**: Formats and emails an executive summary containing overall run metrics, a lead summary table, and complete draft dossiers.
* **Resilient API Fallback Chain**: Queries models in the priority order: `Groq (Llama 3.3 70B)` -> `Gemini Developer API (Gemini 2.5 Flash)` -> `OpenRouter (Llama 3)` -> `Mock Fallback Engine`, preventing rate limits or expired keys from halting pipeline executions.
* **Tavily & Firecrawl Fallback**: Searches the web using Tavily Search (primary), Firecrawl Search (fallback), or Jina Reader (fallback).
* **Vercel-Ready Serverless Config**: Includes automatic database redirection to `/tmp/db.json` for read-write compatibility in serverless environments, static asset rewrites, and cron scheduling configurations.

---

## 🚀 Getting Started

### 1. Installation

Clone the repository and install the backend dependencies:

```bash
git clone https://github.com/ShivUP32/lead-personalisation-agent.git
cd lead-personalisation-agent
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and configure the necessary keys:

```env
# Multi-LLM API Keys (At least one required)
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Search API Keys
TAVILY_API_KEY=your_tavily_api_key_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
JINA_API_KEY=your_jina_api_key_here

# Email Delivery (Resend API)
RESEND_API_KEY=your_resend_api_key_here
REPORT_TO_EMAIL=shivamsingh0013@gmail.com
REPORT_FROM_EMAIL=leads@yourverifieddomain.com

# Vercel Cron Security
CRON_SECRET=your_cron_secret_token_here
```

### 3. Run Locally

Start the local development server:

```bash
python3 run_server.py
```
This loads environment variables from `.env.local` and automatically launches your default browser at `http://localhost:3009`.

### 4. Running Verification Tests

Run the verification test suite to check database state, mock search executions, and build the architecture PDF:

```bash
python3 verify_project.py
```

---

## ☁️ Deployment on Vercel

The project is fully pre-configured for Vercel deployment:

1. **Deploy Repository**: Link the repository to your Vercel project.
2. **Environment Variables**: Configure the variables from your `.env.local` in the Vercel dashboard.
3. **Cron Schedule**: Vercel reads `vercel.json` and automatically schedules the hourly cron check (`/api/cron-run`), which runs the pipeline and triggers emails whenever your custom scheduler criteria are met.
4. **Trigger Cron Locally**: You can manually verify the cron endpoint locally:
   ```bash
   curl -H "Authorization: Bearer your_cron_secret_token_here" "http://localhost:3009/api/cron-run?force=true"
   ```
