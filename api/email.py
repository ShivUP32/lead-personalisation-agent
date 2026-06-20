# api/email.py

import os
import json
import httpx
from typing import List, Dict, Any

def reload_env_vars():
    """Defensive environment variable loader."""
    from dotenv import load_dotenv
    env_paths = [".env.local", ".env.local.txt", ".env"]
    for env_path in env_paths:
        full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), env_path)
        if os.path.exists(full_path):
            load_dotenv(dotenv_path=full_path, override=True)
            break

async def send_daily_report_email(run_date: str, prospects: List[Dict[str, Any]], to_email: str = None) -> bool:
    """Formats and dispatches the daily lead personalization pack via Resend.
    
    If RESEND_API_KEY is not configured or is a placeholder, simulates dispatch.
    """
    reload_env_vars()
    resend_key = os.getenv("RESEND_API_KEY")
    if not to_email:
        to_email = os.getenv("REPORT_TO_EMAIL") or "your_report_email_here@example.com"
    from_email = os.getenv("REPORT_FROM_EMAIL") or "leads@yourdomain.com"
    
    # 1. Calculate executive metrics
    approved_leads = [p for p in prospects if p.get("status") in ["approved", "edited_approved"]]
    needs_review = [p for p in prospects if p.get("status") == "needs_review"]
    manual_res = [p for p in prospects if p.get("status") == "needs_manual_research"]
    
    # 2. Format a gorgeous HTML body matching Growth Engine aesthetics
    html = []
    html.append(f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #0d0f12;
          color: #e2e8f0;
          margin: 0;
          padding: 20px;
        }}
        .container {{
          max-width: 680px;
          margin: 0 auto;
          background-color: #12161b;
          border: 1px solid #1a222a;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }}
        .header {{
          background: linear-gradient(135deg, #0f172a, #1e293b);
          padding: 30px;
          border-bottom: 1px solid #1e293b;
          text-align: center;
        }}
        .header h1 {{
          margin: 0 0 10px 0;
          font-size: 24px;
          color: #38bdf8;
          letter-spacing: 0.5px;
        }}
        .header p {{
          margin: 0;
          font-size: 14px;
          color: #94a3b8;
        }}
        .metrics-grid {{
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 20px;
          background-color: #0f1318;
          border-bottom: 1px solid #1a222a;
        }}
        .metric-card {{
          background-color: #161b22;
          border: 1px solid #21262d;
          border-radius: 6px;
          padding: 15px 10px;
          text-align: center;
        }}
        .metric-val {{
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 4px;
        }}
        .metric-label {{
          font-size: 10px;
          text-transform: uppercase;
          color: #8b949e;
          letter-spacing: 0.5px;
          font-weight: bold;
        }}
        .leads-table {{
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }}
        .leads-table th {{
          background-color: #161b22;
          color: #8b949e;
          font-size: 11px;
          text-transform: uppercase;
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #21262d;
        }}
        .leads-table td {{
          padding: 12px;
          font-size: 13px;
          border-bottom: 1px solid #1a222a;
        }}
        .badge {{
          display: inline-block;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }}
        .badge-approved {{ background-color: rgba(34, 197, 94, 0.15); color: #4ade80; }}
        .badge-review {{ background-color: rgba(234, 179, 8, 0.15); color: #facc15; }}
        .badge-manual {{ background-color: rgba(148, 163, 184, 0.15); color: #cbd5e1; }}
        .prospect-section {{
          padding: 25px 20px;
          border-bottom: 1px solid #1a222a;
        }}
        .prospect-title {{
          font-size: 16px;
          color: #38bdf8;
          margin: 0 0 12px 0;
          font-weight: bold;
        }}
        .message-block {{
          background-color: #0f1318;
          border: 1px solid #1a222a;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
        }}
        .message-hdr {{
          font-size: 11px;
          text-transform: uppercase;
          color: #8b949e;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }}
        .message-body {{
          font-size: 13px;
          color: #cbd5e1;
          white-space: pre-wrap;
          line-height: 1.5;
        }}
        .footer {{
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #484f58;
          background-color: #0f1318;
        }}
        a {{
          color: #58a6ff;
          text-decoration: none;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VoiceCare AI Growth Engine</h1>
          <p>Daily Lead Personalization Report &mdash; {run_date}</p>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-val" style="color: #58a6ff;">{len(prospects)}</div>
            <div class="metric-label">Surfaced</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color: #3fb950;">{len(approved_leads)}</div>
            <div class="metric-label">Approved</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color: #d29922;">{len(needs_review)}</div>
            <div class="metric-label">Needs Review</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color: #8b949e;">{len(manual_res)}</div>
            <div class="metric-label">Manual Research</div>
          </div>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="font-size: 16px; margin-top: 0; color: #8b949e;">Prospect Summary</h2>
          <table class="leads-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Company</th>
                <th>Fit Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    """)
    
    for p in prospects:
        status_raw = p.get("status", "needs_review")
        badge_cls = "badge-review"
        if status_raw in ["approved", "edited_approved"]:
            badge_cls = "badge-approved"
        elif status_raw == "needs_manual_research":
            badge_cls = "badge-manual"
            
        linkedin_link = f"<a href='{p.get('linkedinUrl', '#')}'>{p.get('name')}</a>" if p.get('linkedinUrl') else p.get('name')
        
        html.append(f"""
              <tr>
                <td><strong>{linkedin_link}</strong><br><span style='font-size: 11px; color: #8b949e;'>{p.get('title')}</span></td>
                <td>{p.get('company')}</td>
                <td><span style='font-weight: bold; color: {"#3fb950" if p.get("fitScore", 70) >= 80 else "#d29922"};'>{p.get('fitScore', 'N/A')}</span></td>
                <td><span class="badge {badge_cls}">{status_raw.replace('_', ' ')}</span></td>
              </tr>
        """)
        
    html.append("""
            </tbody>
          </table>
        </div>
    """)
    
    # 3. Add drafts for approved leads
    if approved_leads:
        html.append("<div style='background-color: #161b22; padding: 2px 20px;'><h2 style='font-size: 15px; color: #8b949e;'>Personalized Outreach Drafts</h2></div>")
        for p in approved_leads:
            drafts = p.get("messages", {})
            html.append(f"""
            <div class="prospect-section">
              <div class="prospect-title">{p.get('name')} &mdash; {p.get('company')}</div>
            """)
            
            # Email draft
            email_draft = drafts.get("email", {})
            html.append(f"""
              <div class="message-block">
                <div class="message-hdr">📧 Email Outreach (Subject: {email_draft.get('subject', 'N/A')})</div>
                <div class="message-body">{email_draft.get('text', 'N/A')}</div>
              </div>
            """)
            
            # LinkedIn / SMS drafts
            li_draft = drafts.get("linkedin", {}).get("text") or drafts.get("sms", {}).get("text")
            if li_draft:
                html.append(f"""
                  <div class="message-block">
                    <div class="message-hdr">💬 LinkedIn / Short Message</div>
                    <div class="message-body">{li_draft}</div>
                  </div>
                """)
                
            html.append("</div>")
            
    html.append(f"""
        <div class="footer">
          This daily lead report was compiled automatically by the VoiceCare AI Lead Personalisation Agent.<br>
          Run Date: {run_date} | Recipients: {to_email}
        </div>
      </div>
    </body>
    </html>
    """)
    
    html_content = "".join(html)
    
    # 4. Check if Resend is active
    is_mock = True
    if resend_key:
        resend_key_clean = resend_key.strip()
        if resend_key_clean and not resend_key_clean.startswith("#") and "your_" not in resend_key_clean.lower() and resend_key_clean.lower() != "placeholder" and resend_key_clean != "":
            is_mock = False
            
    if is_mock:
        print("💡 [Resend Email] Key missing/unauthorized. Simulating Daily Report dispatch to console.")
        print(f"==================================================")
        print(f"📧 DAILY LEAD REPORT EMAIL SIMULATOR")
        print(f"From: {from_email}")
        print(f"To: {to_email}")
        print(f"Subject: Daily Lead Personalization Report - {run_date}")
        print(f"Summary: {len(prospects)} leads, {len(approved_leads)} approved, {len(needs_review)} needs review")
        print(f"==================================================")
        return True
        
    # 5. Dispatch via Resend API
    print(f"📧 [Resend Email] Dispatching Daily Report to {to_email} via Resend API...")
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {resend_key.strip()}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": f"Daily Lead Personalization Report - {run_date}",
        "html": html_content
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code in [200, 201]:
                print("✅ [Resend Email] Daily lead report email sent successfully.")
                return True
            else:
                print(f"❌ [Resend Email] API returned status {response.status_code}: {response.text}")
                return False
    except Exception as e:
        print(f"❌ [Resend Email] Dispatch execution failed: {e}")
        return False
