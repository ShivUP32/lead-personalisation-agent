# api/main.py

import os
import sys
# Insert project root to sys.path to resolve api imports in serverless contexts
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from typing import List, Dict, Any, Optional
import os
import json
from pydantic import BaseModel

from api.pipeline import run_pipeline, compile_daily_pack_md
import api.db as db
from api.email import send_daily_report_email

app = FastAPI(title="VoiceCare AI Lead Personalisation Console API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db.init_db()

# Types
class RunPipelineRequest(BaseModel):
    trigger: Optional[str] = "manual"
    targetRoles: Optional[List[str]] = None
    manualInputs: Optional[Dict[str, Any]] = None
    lookbackDays: Optional[int] = 45

class ProspectStatusRequest(BaseModel):
    prospectId: str
    status: str  # approved, rejected, edited_approved, needs_manual_research
    messagesUpdates: Optional[Dict[str, Any]] = None

class ScheduleRequest(BaseModel):
    enabled: bool
    frequency: str
    time: str
    email: str

@app.post("/api/run-pipeline")
async def api_run_pipeline(
    req: RunPipelineRequest,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    # Security check if CRON_SECRET is set
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret:
        # Bypass authorization checks for local development/testing
        host = request.headers.get("host", "")
        is_local = "localhost" in host or "127.0.0.1" in host
        
        if not is_local or authorization:
            expected = f"Bearer {cron_secret}"
            if authorization != expected:
                raise HTTPException(status_code=401, detail="Unauthorized")
            
    try:
        result = await run_pipeline(
            trigger=req.trigger,
            target_roles=req.targetRoles,
            manual_inputs=req.manualInputs,
            lookback_days=req.lookbackDays
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cron-run")
async def api_cron_run(
    request: Request,
    force: bool = False,
    authorization: Optional[str] = Header(None)
):
    """Vercel Cron endpoint to run the personalization pipeline and email reports based on scheduled times."""
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret:
        expected = f"Bearer {cron_secret}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized Cron Execution")
            
    # Load scheduler settings
    schedule = db.get_schedule()
    
    if not force:
        # Check if scheduler is enabled
        if not schedule.get("enabled", False):
            return {"ok": True, "skipped": True, "reason": "Scheduler is disabled in settings."}
            
        # Parse trigger hour and minute from target time e.g. "09:00"
        try:
            target_time = schedule.get("time", "09:00")
            sched_hour, sched_min = map(int, target_time.split(":"))
        except Exception:
            sched_hour, sched_min = 9, 0
            
        from datetime import datetime
        now = datetime.utcnow()
        
        # Check if the current hour matches the scheduled hour (UTC)
        if now.hour != sched_hour:
            return {
                "ok": True,
                "skipped": True,
                "reason": f"Current hour {now.hour} UTC does not match scheduled hour {sched_hour} UTC."
            }
            
        # Check frequency interval against last_run
        last_run_str = schedule.get("last_run")
        if last_run_str:
            try:
                last_run_dt = datetime.fromisoformat(last_run_str)
                elapsed_hours = (now - last_run_dt).total_seconds() / 3600.0
                frequency = schedule.get("frequency", "daily")
                
                # Check intervals (with slight buffer, e.g. 22h, 46h, 166h)
                if frequency == "daily" and elapsed_hours < 22.0:
                    return {"ok": True, "skipped": True, "reason": f"Daily interval not met yet. {elapsed_hours:.1f}h elapsed."}
                elif frequency == "alternate" and elapsed_hours < 46.0:
                    return {"ok": True, "skipped": True, "reason": f"Alternate day interval not met yet. {elapsed_hours:.1f}h elapsed."}
                elif frequency == "weekly" and elapsed_hours < 166.0:
                    return {"ok": True, "skipped": True, "reason": f"Weekly interval not met yet. {elapsed_hours:.1f}h elapsed."}
            except Exception as e:
                print(f"Error parsing last_run: {e}")
                
    try:
        # Run personalization pipeline
        result = await run_pipeline(
            trigger="cron",
            target_roles=None,
            manual_inputs=None,
            lookback_days=45
        )
        
        # Compile Daily Lead Pack and Send Email if prospects exist
        email_sent = False
        if result.get("ok") and result.get("prospects"):
            run_date = result.get("runDate")
            prospects = result.get("prospects")
            
            # Send report email to the scheduled recipient
            to_email = schedule.get("email") or os.getenv("REPORT_TO_EMAIL")
            email_sent = await send_daily_report_email(run_date, prospects, to_email=to_email)
            result["emailSent"] = email_sent
            
        # Update last_run timestamp
        from datetime import datetime
        schedule["last_run"] = datetime.utcnow().isoformat()
        db.save_schedule(schedule)
        
        result["schedulerRun"] = True
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schedule")
def api_get_schedule():
    try:
        return db.get_schedule()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedule")
def api_save_schedule(
    req: ScheduleRequest,
    authorization: Optional[str] = Header(None)
):
    cron_secret = os.getenv("CRON_SECRET")
    if cron_secret:
        expected = f"Bearer {cron_secret}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")
            
    try:
        schedule_data = {
            "enabled": req.enabled,
            "frequency": req.frequency,
            "time": req.time,
            "email": req.email,
            "last_run": db.get_schedule().get("last_run")
        }
        db.save_schedule(schedule_data)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def api_get_history():
    try:
        return db.get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prospect/status")
def api_update_prospect_status(req: ProspectStatusRequest):
    try:
        success = db.update_prospect_status(req.prospectId, req.status, req.messagesUpdates)
        if success:
            return {"ok": True}
        raise HTTPException(status_code=404, detail="Prospect not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pack")
def api_download_pack(runDate: str):
    try:
        history = db.get_history()
        run = next((r for r in history if r.get("run_date") == runDate), None)
        if not run:
            raise HTTPException(status_code=404, detail=f"No run found for date {runDate}")
            
        prospects = run.get("prospects", [])
        md_content = compile_daily_pack_md(runDate, prospects)
        
        headers = {
            "Content-Disposition": f'attachment; filename="daily-lead-pack-{runDate}.md"'
        }
        return PlainTextResponse(md_content, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/version")
def api_get_version():
    return {
        "activeVersion": "v1.0.0-dev",
        "releaseDate": "2026-06-20T00:00:00Z",
        "description": "VoiceCare AI Lead Personalisation Console"
    }

# Mount static files at root so relative assets (styles.css, app.js) resolve correctly from `/`
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
    
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
