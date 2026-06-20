import os
import json
import uuid
from datetime import datetime, date

if os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV"):
    DB_FILE = "/tmp/db.json"
else:
    DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db.json")

def init_db():
    """Initializes the db.json file if it does not exist."""
    if not os.path.exists(DB_FILE):
        default_data = {
            "runs": [],
            "prospects": [],
            "dedup_index": []
        }
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        print("📁 db.json database file initialized.")

def load_db():
    """Loads and returns the database contents."""
    init_db()
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading db.json: {e}")
        return {"runs": [], "prospects": [], "dedup_index": []}

def save_db(db):
    """Saves the database contents to db.json."""
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, default=str)
    except Exception as e:
        print(f"Error saving db.json: {e}")

def get_history():
    """Retrieves the run history along with their associated prospects."""
    db = load_db()
    # Sort runs by started_at desc
    sorted_runs = sorted(db.get("runs", []), key=lambda x: x.get("started_at", ""), reverse=True)
    
    # Map prospects to runs
    prospects = db.get("prospects", [])
    
    for run in sorted_runs:
        run_date = run.get("run_date")
        run["prospects"] = [p for p in prospects if p.get("run_date") == run_date]
        
    return sorted_runs

def is_duplicate(name, company, linkedin_url=None, lookback_days=45) -> bool:
    """Checks if a prospect with the same name and company (or LinkedIn URL) was surfaced within lookback_days."""
    db = load_db()
    dedup_entries = db.get("dedup_index", [])
    
    norm_name = name.strip().lower()
    norm_company = company.strip().lower()
    norm_li = linkedin_url.strip().lower() if linkedin_url else None
    
    today = datetime.utcnow().date()
    
    for entry in dedup_entries:
        entry_date_str = entry.get("last_surfaced_date")
        try:
            entry_date = datetime.strptime(entry_date_str.split("T")[0], "%Y-%m-%d").date()
        except Exception:
            continue
            
        diff_days = (today - entry_date).days
        if diff_days <= lookback_days:
            # Check matches
            entry_name = entry.get("normalized_name", "").strip().lower()
            entry_company = entry.get("normalized_company", "").strip().lower()
            entry_li = entry.get("linkedin_url", "")
            entry_li = entry_li.strip().lower() if entry_li else None
            
            # Match by LinkedIn URL
            if norm_li and entry_li and norm_li == entry_li:
                return True
                
            # Match by name and company
            if norm_name == entry_name and norm_company == entry_company:
                return True
                
    return False

def add_to_dedup(name, company, linkedin_url=None):
    """Adds a prospect to the deduplication index."""
    db = load_db()
    entry = {
        "id": str(uuid.uuid4()),
        "normalized_name": name.strip().lower(),
        "normalized_company": company.strip().lower(),
        "linkedin_url": linkedin_url.strip() if linkedin_url else None,
        "last_surfaced_date": datetime.utcnow().isoformat()
    }
    db["dedup_index"].append(entry)
    save_db(db)

def save_run(run_date, trigger, status, prospects_surfaced, stage_log, started_at, completed_at, prospects_list):
    """Saves a new run record and the associated prospects to the database."""
    db = load_db()
    
    # Save the run log
    run_id = str(uuid.uuid4())
    run_record = {
        "id": run_id,
        "run_date": run_date,
        "trigger": trigger,
        "status": status,
        "prospects_surfaced": prospects_surfaced,
        "stage_log": stage_log,
        "started_at": started_at,
        "completed_at": completed_at
    }
    
    # Check if a run for this run_date already exists to prevent duplicate runs on the same date
    db["runs"] = [r for r in db["runs"] if r.get("run_date") != run_date]
    db["runs"].append(run_record)
    
    # Remove old prospects for this run_date to ensure idempotency
    db["prospects"] = [p for p in db["prospects"] if p.get("run_date") != run_date]
    
    # Add new prospects
    for prospect in prospects_list:
        prospect["id"] = prospect.get("id") or str(uuid.uuid4())
        prospect["run_date"] = run_date
        prospect["created_at"] = datetime.utcnow().isoformat()
        
        # Add to dedup index as well if they are valid candidates
        if prospect.get("status") != "needs_manual_research":
            add_to_dedup(prospect["name"], prospect["company"], prospect.get("linkedin_url"))
            
        db["prospects"].append(prospect)
        
    save_db(db)
    print(f"✅ Pipeline run {run_date} saved with {len(prospects_list)} prospects.")
    return run_id

def update_prospect_status(prospect_id, status, messages_updates=None):
    """Updates the review status and optionally the message drafts for a prospect."""
    db = load_db()
    updated = False
    
    for p in db.get("prospects", []):
        if p.get("id") == prospect_id:
            p["status"] = status
            p["reviewed_at"] = datetime.utcnow().isoformat()
            
            # If there are human edits, merge them
            if messages_updates:
                p["outreach_messages"] = p.get("outreach_messages", {})
                for key, val in messages_updates.items():
                    if key in p["outreach_messages"]:
                        p["outreach_messages"][key]["text"] = val.get("text", p["outreach_messages"][key]["text"])
                        p["outreach_messages"][key]["subject"] = val.get("subject", p["outreach_messages"][key].get("subject"))
                        p["outreach_messages"][key]["was_edited_by_human"] = True
                        
            updated = True
            break
            
    if updated:
        save_db(db)
        return True
    return False

def get_schedule():
    """Retrieves the schedule configuration from db.json."""
    db = load_db()
    return db.get("schedule", {
        "enabled": False,
        "frequency": "daily",
        "time": "09:00",
        "email": "shivamsingh0013@gmail.com",
        "last_run": None
    })

def save_schedule(schedule_data):
    """Saves the schedule configuration to db.json."""
    db = load_db()
    db["schedule"] = schedule_data
    save_db(db)
    print("📅 Scheduler configuration saved.")

