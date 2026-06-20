# PRD — Scalable Lead Personalization Agent

**Project:** Lead Personalization Agent for VoiceCare AI
**Status:** Prototype specification
**Companion product:** AI Growth Engine Agent (LinkedIn/GEO visibility). This agent is the downstream, account-level counterpart — it finds and researches individual prospects rather than building category-level visibility.

Use this as the build direction for the MVP.

---

## 1. Problem Statement

VoiceCare AI's go-to-market team needs a steady stream of warm, well-researched outbound conversations with healthcare RCM and patient-access leaders — without buying lead lists, without LinkedIn automation, and without sending generic AI-sounding outreach that damages the brand.

Manually researching 5 strong prospects a day — finding a real recent signal (a post, a job change, a hiring spree, a conference talk) and writing a message that ties that signal to a specific VoiceCare AI use case — is high-value work but too time-consuming to do consistently every day.

The agent must do the research and drafting. It must never do the contacting. Every message is a draft that a human reads, edits if needed, and sends manually from their own LinkedIn account or email client.

---

## 2. Goals

1. Surface 5 high-value prospects every day: Healthcare Practice Managers, Revenue Cycle Owners, Patient Access Leaders, RCM Directors, Billing Operations Leaders, Healthcare Operations Leaders, Practice Administrators.
2. For each prospect, find at least one verifiable, recent, public signal (post, job change, company news, hiring signal, conference/webinar appearance, podcast mention, press release).
3. Map that signal to a specific VoiceCare AI pain point (payer hold times, claims status follow-ups, eligibility verification, prior authorization follow-ups, manual RCM workload, patient access operations, billing operations workload, scaling admin without headcount).
4. Generate three ready-to-edit message formats per prospect: LinkedIn connection note, LinkedIn follow-up message, cold email.
5. Run automatically on a daily cadence (target: 9:00 AM PT / 10:00 AM IST) with no manual trigger required, while still supporting an on-demand "Run Now" trigger for testing.
6. Give every claim in every message a traceable public source URL.
7. Make under-researched prospects impossible to send by default — anything without a strong, verified signal is routed to "needs manual research," never silently weakened into a generic message.
8. Prioritize quality over volume: 5 well-grounded prospects per day beats 50 weak ones.

---

## 3. Non-Goals

The product must not include:

- LinkedIn scraping, in any form.
- Sales Navigator scraping.
- Browser automation inside LinkedIn (no logged-in session, no headless browser driving LinkedIn pages).
- Auto-connect, auto-DM, auto-InMail, auto-comment, auto-like, auto-follow, or auto-profile-visit.
- Sending any message on the prospect's behalf or the rep's behalf. The agent drafts; a human sends.
- Fabricated activity, fabricated quotes, or any signal the agent cannot point to a real public URL for.
- Claims of accessing private LinkedIn data, connections-only content, or anything behind a login wall.
- Unsupported ROI, compliance, or clinical-outcome claims in outreach copy.
- Purchased or scraped contact-list enrichment (email-finder/phone-finder scraping of third-party paid databases is out of scope for the MVP; CRM-provided lead lists and manually supplied profile URLs are the supported substitute).
- PHI or any patient-level data, at any stage.

---

## 4. User Personas

| Persona | Need |
|---|---|
| SDR / BDR at VoiceCare AI | Wants 5 ready-to-personalize-and-send drafts each morning, with the legwork already done. |
| Sales/RevOps lead | Wants visibility into prospect quality (fit/confidence scores), source traceability, and a daily audit trail. |
| Marketing/Compliance reviewer | Wants assurance no message overstates outcomes and no automation touches LinkedIn directly. |
| Engineer/maintainer | Wants a daily job that fails loudly, logs clearly, and is cheap to operate. |

---

## 5. Core Workflow

1. Scheduled trigger fires daily (cron / Vercel Cron / GitHub Actions).
2. **Discovery agent** searches public sources for candidate prospects matching the target roles.
3. **Scoring agent** filters and ranks candidates against the scoring model; selects the top 5.
4. **Research enrichment agent** gathers public detail on each selected prospect and their company.
5. **Signal extraction agent** identifies the single strongest recent, verifiable signal per prospect.
6. **Use-case matching agent** maps that signal to a specific VoiceCare AI pain point and use case.
7. **Outreach drafting agent** generates the three message formats, grounded only in verified facts.
8. **Quality/safety review agent** checks every draft against the message rules and compliance boundaries before it reaches a human.
9. Output is written to the storage layer with full source citations and a human-review checklist.
10. A human opens the review dashboard, approves/edits/rejects each draft, and sends manually.
11. Nothing is sent, posted, connected, or messaged by the system at any point.

---

## 6. Functional Requirements

The system must:

1. Run unattended on a daily schedule and also support a manual "Run Now" trigger.
2. Accept CRM-provided lead lists and manually supplied LinkedIn profile URLs / copied activity text as direct discovery input.
3. Search only public, non-logged-in sources: company sites, leadership/team pages, press releases, news, job postings, conference/speaker pages, podcast/webinar pages, public interviews, and search-engine-indexed snippets.
4. Respect robots.txt, rate limits, and source terms of service on every fetch.
5. Score and rank candidate prospects using the model in Section 9; select exactly 5 per run (fewer if fewer than 5 clear strong fits exist that day — never pad with weak fits).
6. For every prospect, require at least one signal with a real, working source URL before drafting begins. If none is found, mark the prospect `needs_manual_research` and exclude them from the day's 5, backfilling from the next-ranked candidate.
7. Produce all 17 required output fields per prospect (Section 8 of this document; full schema in `AGENT_FLOWS.md`).
8. Produce all three message formats per prospect, each passing the message rules in `AGENT_FLOWS.md` / `OUTREACH_PROMPTS` section.
9. Deduplicate against prospects surfaced in prior runs (same person, same company within a configurable lookback window) before presenting new candidates.
10. Persist every run's full output, including source URLs, to the storage layer for audit.
11. Surface a human review queue with an explicit checklist and an approve / edit / reject / needs-more-research status per prospect.
12. Allow copy and Markdown download of an individual prospect dossier and of the full day's combined pack.
13. Alert (email/Slack webhook) on run failure, partial failure, or a day where fewer than 5 strong prospects are found.

---

## 7. Non-Functional Requirements

- **Latency:** full daily run should complete within the scheduler's execution window (target under 5 minutes; hard ceiling set by serverless function `maxDuration`, see `VERCEL_ENV_SETUP.md`).
- **Cost control:** cap LLM and search-API spend per run via per-agent token/query limits; log spend per run.
- **Idempotency:** re-running the pipeline for a date that already has output must not duplicate prospects or overwrite human-reviewed decisions.
- **Auditability:** every factual claim used in a message must resolve to a stored source URL.
- **Resilience:** a single prospect's research failure must not fail the entire run; that prospect is marked `needs_manual_research` and the run continues.
- **Observability:** structured logs per agent stage, per run, with timestamps and pass/fail status.

---

## 8. Required Per-Prospect Output Fields

1. Prospect Name
2. Role / Title
3. Company
4. Company Website
5. LinkedIn Profile URL (only if found via safe/public means or manually supplied)
6. Source URLs used for research
7. Recent personalization signal
8. Signal type (post / job change / news / hiring / conference / podcast / press release / website update / other)
9. Why this prospect is relevant
10. Company pain hypothesis
11. Relevant VoiceCare AI use case
12. Fit score (0–100)
13. Confidence score (0–100)
14. Outreach message draft (3 formats)
15. Follow-up message draft
16. Risk notes / missing information
17. Human review checklist

Full field-level schema, types, and validation rules live in `AGENT_FLOWS.md`.

---

## 9. Scoring Model (Summary)

Prospects are scored 0–100 on a weighted blend of:

| Criterion | What it measures |
|---|---|
| Role relevance | How closely the title matches the target persona list |
| Company fit | Healthcare provider/RCM operation size and complexity match |
| RCM complexity | Evidence of multi-payer, high-volume, or manual-heavy operations |
| Patient access relevance | Evidence of patient access / scheduling / eligibility workload |
| Recent trigger strength | How strong and timely the discovered signal is |
| Personalization quality | How specific and non-generic the available signal is |
| Public source confidence | Reliability of the source(s) the signal came from |
| VoiceCare use-case fit | How directly the signal maps to a VoiceCare AI capability |
| Seniority / buying influence | Likely influence over an RCM/patient-access buying decision |
| Timeliness of signal | Recency of the signal (last 30–60 days weighted highest) |

A companion **confidence score** is tracked separately and reflects how certain the agent is that the facts used are accurate and current — low confidence routes a prospect to manual review even if the fit score is high. Full weighting and calculation logic live in `AGENT_FLOWS.md`.

---

## 10. Compliance Boundaries

- No LinkedIn scraping, no Sales Navigator scraping, no browser automation inside LinkedIn, no auto-connect/auto-DM/auto-comment/auto-like/auto-follow.
- LinkedIn outreach is generated as a draft only; a human copies and sends it manually from their own account.
- The agent never claims to have accessed private or logged-in LinkedIn data.
- The agent never fabricates a recent activity, quote, or statistic. If it cannot verify a signal from a real public URL, it does not invent one.
- No PHI or patient-level data is ingested, stored, or referenced at any stage.
- No unsupported ROI, compliance, or clinical-outcome claims in any draft.
- Every source URL used in a message must be stored and auditable.

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Strong prospects surfaced per run | 5 (or fewer, explicitly flagged, never padded) |
| Prospects with a verified signal + source URL | 100% of surfaced prospects |
| Average fit score of surfaced prospects | ≥ 70/100 |
| Average confidence score of surfaced prospects | ≥ 70/100 |
| Human edit rate before sending | Tracked, not penalized — used to tune prompts |
| Reply rate on sent messages | Tracked via CRM/manual logging (outside MVP scope to automate) |
| Run reliability | ≥ 95% successful unattended daily runs over a rolling 30 days |
| Duplicate prospects resurfaced within lookback window | 0 |
| Compliance violations (automation/scraping/fabrication) | 0, enforced by the quality/safety review agent and manual audit |

---

## 12. MVP Scope

- Daily scheduled run producing 5 prospect dossiers with all 17 fields and 3 message formats each.
- Discovery limited to: company websites, news/press releases, job postings, conference/podcast/webinar pages, search-engine snippets, manually supplied LinkedIn URLs or pasted activity text, and CRM-provided lead lists.
- Single storage backend (Supabase recommended; Airtable/Google Sheets acceptable no-code alternative — see `AGENT_FLOWS.md`).
- Single review dashboard (see `DESIGN.md`) with approve/edit/reject workflow.
- Manual "Run Now" trigger in addition to the daily schedule.
- Markdown export per prospect and per day.
- Slack/email failure alerting.

## 13. Future Scope (explicitly out of MVP)

- Automatic CRM write-back (e.g., auto-creating a Salesforce/HubSpot lead record on approval).
- Reply detection and automated follow-up sequencing.
- A/B testing of message variants with outcome tracking.
- Paid contact-enrichment integrations (e.g., verified email finders).
- Multi-language outreach drafts.
- Team-based assignment/routing of prospects to specific reps.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| LinkedIn ToS violation | No scraping, no logged-in automation, no auto-actions of any kind. Drafts only. |
| Fabricated or stale "recent" signal | Hard requirement: every signal must resolve to a stored, fetchable source URL with a captured date; no source URL → no signal → prospect routed to manual research. |
| Generic, bot-sounding messages | Message rules forbid generic AI phrasing and fake familiarity; quality/safety review agent rejects drafts that fail a specificity check before they reach the human queue. |
| Overpromising ROI/compliance outcomes | Shared safety prompt block explicitly forbids unsupported claims; reviewed again at the quality/safety stage. |
| Search/LLM API outage breaks the daily run | Per-agent fallback model; a single prospect's failure is isolated and doesn't fail the whole run; failure alert fires if the run can't reach 5 prospects. |
| Duplicate outreach to the same person | Deduplication against prior runs within a configurable lookback window before a prospect is presented. |
| Cost runaway from search/LLM calls | Per-run query and token caps, logged spend per run, alert on anomalies. |
| Reviewer fatigue / rubber-stamping | Review checklist forces explicit confirmation of source, claim accuracy, and tone per prospect — not a single bulk-approve action. |

---
