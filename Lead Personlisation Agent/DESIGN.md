# DESIGN.md — Lead Personalization Agent Console

This file defines the UI for the Lead Personalization Agent, reusing the same visual system as the AI Growth Engine console (warm paper background, flat cards, hairline borders, restrained accent color, status dots, readable markdown output) but reshaping the layout around this product's actual job: a **daily automated batch run** reviewed by a human, not a set of agents the operator triggers individually.

Do not introduce a heavy dashboard look, drop shadows, gradients, or dense data-grid styling. Keep it calm, flat, and quiet — closer to a well-organized notebook than an analytics product.

---

## 1. Design Scope

The Growth Engine console is "operator runs 6 agents on demand." This console is "the system already ran overnight; the operator reviews and ships." The primary unit of the UI is not an agent card — it's a **prospect card**, one per surfaced lead, with the 7-stage pipeline shown as a slim status strip above the queue.

```text
Desktop:
┌─────────────────────────────────────────────┐
│ Header                                       │
├─────────────────────────────────────────────┤
│ Run Control bar                              │
├─────────────────────────────────────────────┤
│ Pipeline status strip (7 stages)             │
├─────────────────────────────────────────────┤
│ Manual Input panel (collapsed by default)    │
├─────────────────────────────────────────────┤
│ Prospect Review Queue (5 cards, stacked)     │
├─────────────────────────────────────────────┤
│ Daily Pack actions                           │
├─────────────────────────────────────────────┤
│ Footer: compliance note + doc links          │
└─────────────────────────────────────────────┘

Tablet/Mobile: same order, full-width single column,
pipeline strip becomes a horizontal scroll of 7 dots.
```

---

## 2. Pipeline Stage Labels

| Code | UI Label | Short description |
|---|---|---|
| STAGE 01 | Discovery | Search public sources for candidate prospects. |
| STAGE 02 | Scoring | Filter and rank candidates; select the top 5. |
| STAGE 03 | Research | Enrich each selected prospect and their company. |
| STAGE 04 | Signal | Extract the single strongest verifiable recent signal. |
| STAGE 05 | Use-Case Match | Map the signal to a specific VoiceCare AI pain point. |
| STAGE 06 | Drafting | Generate connection note, follow-up, and cold email. |
| STAGE 07 | Quality Review | Check every draft against message and compliance rules. |

Each stage renders as a small labeled dot in the status strip, left to right, connected by a thin hairline. States reuse the existing dot system:

| State | Visual | Meaning |
|---|---|---|
| idle | hollow circle | Not yet run today |
| running | rust pulse | Currently executing |
| done | solid teal | Completed successfully |
| error | solid red | Failed — run continues, isolated to affected prospect(s) where possible |
| skipped | hollow circle, dashed ring | Skipped (e.g., backfill not needed) |

Below the strip, one metadata line:

```text
LAST RUN: 2026-06-20 09:02 PT · NEXT RUN: 2026-06-21 09:00 PT · MODE: scheduled
```

---

## 3. Run Control Bar

```text
┌───────────────────────────────────────────────────────────┐
│  ● Last run: today 9:02 AM PT — 5 prospects ready          │
│                                                              │
│  [ Run Pipeline Now ]   [ View Run Log ]   [ Download Pack ]│
└───────────────────────────────────────────────────────────┘
```

- "Run Pipeline Now" is a manual override for testing or a missed schedule. It triggers the same pipeline the cron job calls and is disabled (greyed, tooltip "Already running") while a run is in progress.
- "View Run Log" opens a flat, monospace log panel (stage timestamps, source counts, fallback notices, errors) — no separate page, just an expandable panel.
- "Download Pack" exports the combined daily Markdown pack described in Section 7.

---

## 4. Manual Input Panel (collapsed by default)

Click to expand. Same input styling as the Growth Engine (`--bg` background, `--surface` on focus, 1px `--border`, 6px radius, no shadows).

```text
Manually supplied LinkedIn profile URLs or pasted activity text
(one per line — used as direct discovery input, never scraped)

[textarea]

CRM-provided lead list (CSV paste or upload)

[textarea / file input]

[ Add to next run ]
```

These inputs feed Stage 01 (Discovery) directly, bypassing open web search for that specific prospect, but the prospect still passes through every later stage (research, signal extraction, scoring, drafting, review) like any other candidate.

---

## 5. Prospect Review Queue

Five cards, stacked vertically, newest run on top. Each card is flat, hairline-bordered, generous whitespace — no drop shadow.

**Collapsed card:**

```text
┌───────────────────────────────────────────────────────────┐
│ Jordan Lee · Director of Revenue Cycle · Summit Health Group│
│ Fit 84 · Confidence 79 · Signal: LinkedIn post (4 days ago) │
│ Status: ● Needs review                          [ Open ▾ ] │
└───────────────────────────────────────────────────────────┘
```

Status badge colors:

| Status | Visual |
|---|---|
| Needs review | rust dot |
| Approved | solid teal dot |
| Edited & approved | teal dot, outlined |
| Rejected | hollow grey dot |
| Needs manual research | red dot |

**Expanded card** (click "Open"):

```text
┌───────────────────────────────────────────────────────────┐
│ Jordan Lee — Director of Revenue Cycle, Summit Health Group │
│ summithealthgroup.com · linkedin.com/in/jordanlee-rcm        │
│                                                               │
│ Signal (job change, 4 days ago)                              │
│ "Promoted to Director of Revenue Cycle, per company LinkedIn │
│  page update." — sourced, link below                         │
│                                                               │
│ Why relevant: New leader, likely re-evaluating RCM vendor mix│
│ Pain hypothesis: Multi-EHR claims follow-up bottleneck        │
│ VoiceCare use case: Automated claims status follow-up         │
│                                                               │
│ Fit 84/100 · Confidence 79/100                               │
│                                                               │
│ [ Connection Note ] [ Follow-up ] [ Cold Email ]   ← tabs    │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ message text, editable inline                          │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ Sources used (3)                                              │
│  1. Summit Health Group — LinkedIn company page update ↗     │
│  2. Summit Health Group — press release, May 2026 ↗           │
│  3. Summit Health Group — careers page ↗                      │
│                                                               │
│ Risk notes: Title change not yet reflected on company website│
│                                                               │
│ Human review checklist                                        │
│  [ ] Signal is accurate and current as written                │
│  [ ] No fabricated or unverifiable claim                      │
│  [ ] Tone sounds human, not templated                         │
│  [ ] No overpromised ROI/compliance outcome                   │
│  [ ] CTA is low-pressure                                       │
│                                                               │
│  [ Approve ]   [ Edit & Approve ]   [ Reject ]   [ Needs more research ] │
└───────────────────────────────────────────────────────────┘
```

The checklist must be fully checked before "Approve" is enabled. "Edit & Approve" unlocks inline editing of the message text first.

---

## 6. Output Readability

Long source lists and message variants reuse the Growth Engine's readability rules:

```css
.prospect-card table {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.prospect-card .sources li {
  font-size: 0.85rem;
  line-height: 1.5;
}

.prospect-card .message-tabs textarea {
  width: 100%;
  min-height: 120px;
  resize: vertical;
  white-space: pre-wrap;
}
```

Section labels inside a card (Signal, Why relevant, Pain hypothesis, Sources, Risk notes) are visually quieter (smaller, muted color) than the prospect's name, which stays the visual anchor of the card.

If a fallback model without live search was used for discovery or research on a given prospect, show the existing inline note banner at the top of that card:

```text
Live web search was unavailable for part of this research, so some details used model knowledge only. Verify recency manually before sending.
```

---

## 7. Daily Pack Actions

```text
┌───────────────────────────────────────────────────────────┐
│  Daily Lead Pack — 2026-06-20                                │
│  5 prospects · 3 approved · 1 edited · 1 needs review        │
│                                                               │
│  [ Copy Pack ]   [ Download .md ]                            │
└───────────────────────────────────────────────────────────┘
```

Downloads `daily-lead-pack-2026-06-20.md` containing all 5 prospect dossiers in the schema defined in `AGENT_FLOWS.md`, including review status and source URLs — usable as a standalone audit record even without the dashboard.

---

## 8. Footer

Matches the Growth Engine footer pattern exactly, swapping doc links:

```text
No LinkedIn automation. No scraping. No auto-DMs. No fabricated activity.
Human review and manual sending required for every message.

PRD · Design · Agent flows · Setup
```

---
