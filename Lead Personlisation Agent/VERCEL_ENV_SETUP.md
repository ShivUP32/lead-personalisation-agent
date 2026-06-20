# Vercel Environment, API Keys, and Deployment Setup Guide

This guide describes how to deploy the **Lead Personalization Agent** on Vercel for free, set up API keys (Jina, Groq, OpenRouter, and Gemini), and run scheduled cron tasks.

---

## 1. Vercel Configuration (`vercel.json`)

The project is pre-configured with a root [vercel.json](file:///Users/shiv/.gemini/antigravity/scratch/lead-personalisation-agent/vercel.json) file that maps routes and sets maximum function execution times:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/main.py" },
    { "source": "/(.*)", "destination": "/static/$1" }
  ],
  "functions": {
    "api/main.py": {
      "maxDuration": 60
    }
  }
}
```

* **API Rewrite**: Directs all `/api/*` requests to the FastAPI ASGI entry point at `api/main.py`.
* **Static Assets**: Routes base requests to the interactive Figma/n8n console dashboard located in `static/`.
* **Function Timeout**: Configures `maxDuration` to `60` seconds (the maximum duration allowed for Vercel hobby/pro plans) to give the multi-stage research pipeline sufficient time to execute.

---

## 2. Environment Variables Configuration

To run the pipeline with live models and web search, add these keys either to your local `.env` / `.env.local` file, or as environment variables in the **Vercel Project Dashboard** (under Settings → Environment Variables):

| Variable | Description | Required / Optional |
|---|---|---|
| `JINA_API_KEY` | Bearer token for Jina Search (`s.jina.ai`) and Reader (`r.jina.ai`). Provides clean markdown output for scraping and searching. | **Required** (otherwise falls back to Tavily or simulated/mock search data) |
| `TAVILY_API_KEY` | Key for Tavily Search API. Functions as the primary web search engine. | **Required** (otherwise falls back to Firecrawl or Jina Search) |
| `FIRECRAWL_API_KEY` | Key for Firecrawl Search (`api.firecrawl.dev`). Functions as the first web search fallback after Tavily. | **Optional** (highly recommended as a backup search provider) |
| `GROQ_API_KEY` | Key for Groq. Used as the primary provider executing `llama-3.3-70b-versatile` for fast reasoning and compliance checks. | **Required** (otherwise falls back to Gemini or OpenRouter) |
| `OPENROUTER_API_KEY` | Key for OpenRouter. Used as a secondary fallback executing `openrouter/free` (or free Llama models). | **Optional** (serves as backup) |
| `GEMINI_API_KEY` | Key for the Gemini Developer API directly. Executes `gemini-2.5-flash` as a primary alternative or secondary fallback. | **Optional** (serves as backup/alternate primary) |
| `SALES_NAVIGATOR_API_KEY` | Key for the LinkedIn Sales Navigator API. If set, searches real leads; otherwise falls back to high-fidelity mock candidate extraction. | **Optional** (enables Sales Navigator API mode) |
| `RESEND_API_KEY` | Key for the Resend API (`resend.com`). Used to deliver daily HTML email reports of leads and outreach copies. | **Optional** (enables Resend email delivery; otherwise prints reports to console logs) |
| `REPORT_TO_EMAIL` | Recipient email address for the daily HTML lead packs. | **Optional** (defaults to placeholder) |
| `REPORT_FROM_EMAIL` | Sender email address verified on your Resend account (e.g. `onboarding@resend.dev` or a custom verified domain email). | **Optional** (defaults to onboarding sender) |
| `CRON_SECRET` | A secure, random token used to authorize automated scheduled runs of `/api/cron-run`. | **Required** (protects the trigger endpoint from unauthorized calls) |

### Format for Local `.env` File
Create a `.env` file in the project root:
```text
JINA_API_KEY=jina_...
TAVILY_API_KEY=tvly-...
FIRECRAWL_API_KEY=fc-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=AIzaSy...
SALES_NAVIGATOR_API_KEY=your_key_here
RESEND_API_KEY=re_...
REPORT_TO_EMAIL=leads@yourdomain.com
REPORT_FROM_EMAIL=onboarding@resend.dev
CRON_SECRET=your_long_random_hash_string_here
```

---

## 3. Serverless Database Handling

* **Zero-Cost Design**: The project does not require Supabase or any third-party database.
* **Vercel Behavior**: Vercel Serverless Functions have a read-only filesystem, making writes to the project root directory impossible.
* **Auto-Fallback**: The pipeline is configured to automatically write to Vercel's ephemeral `/tmp/db.json` directory when it detects a serverless environment (`VERCEL` env is present).
* **Local Behavior**: When running locally, it writes directly to `db.json` in your project root, giving you persistent run logs, prospect cards, and 45-day lookup deduplication tables across restarts.

---

## 4. Step-by-Step Vercel Deployment

1. **Push to GitHub**:
   Ensure your code is committed to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Lead Personalisation Agent"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Import Project**:
   * Open the [Vercel Dashboard](https://vercel.com/dashboard).
   * Click **Add New** → **Project**.
   * Import your GitHub repository.

3. **Configure Settings**:
   * **Framework Preset**: Choose `Other` (Vercel automatically detects the `vercel.json` and builds a Python Serverless Function).
   * **Root Directory**: Leave as `./` (or select the subdirectory where the files live).
   * **Environment Variables**: Expand this section and input your API keys:
     - `JINA_API_KEY`
     - `GROQ_API_KEY`
     - `OPENROUTER_API_KEY`
     - `GEMINI_API_KEY`
     - `CRON_SECRET`

4. **Deploy**:
   * Click **Deploy**. Vercel will build the dependencies listed in `requirements.txt` and launch your serverless deployment.

---

## 5. Daily Scheduler Setup

The pipeline is designed to run automatically. You can choose one of the following methods:

### Option A: Vercel Cron Jobs (Recommended)
Add the following to your `vercel.json` if you want Vercel to trigger the run directly:
```json
{
  "crons": [
    {
      "path": "/api/cron-run",
      "schedule": "0 9 * * *"
    }
  ]
}
```
* **Note**: `0 9 * * *` executes daily at 9:00 AM UTC.
* Protect this route by ensuring Vercel triggers it with an authorization header matching `Bearer <CRON_SECRET>`.

### Option B: GitHub Actions Cron
Alternatively, create `.github/workflows/daily-lead-run.yml`:
```yaml
name: Daily Lead Personalisation Run
on:
  schedule:
    - cron: '0 9 * * *' # Runs daily at 9:00 AM UTC
  workflow_dispatch: {}

jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Pipeline
        run: |
          curl -sSf "https://your-app.vercel.app/api/cron-run" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```
* Add `CRON_SECRET` to your GitHub Repository Secrets.
