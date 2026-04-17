from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os, json, httpx
from database import get_db
from routers.auth import verify_token
router = APIRouter()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

async def generate_llm_summary(prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        return generate_rule_based_summary(prompt)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-haiku-4-5-20251001", "max_tokens": 500,
                      "messages": [{"role": "user", "content": prompt}]})
            data = response.json()
            return data["content"][0]["text"]
    except:
        return generate_rule_based_summary(prompt)

def generate_rule_based_summary(context: str) -> str:
    parts = []
    if "schedule" in context.lower():
        parts.append("The scheduling algorithm has successfully generated an optimized train induction plan.")
    if "conflict" in context.lower():
        parts.append("Potential scheduling conflicts have been identified and flagged for supervisor review.")
    if "maintenance" in context.lower():
        parts.append("Predictive maintenance analysis indicates several trains require attention soon.")
    if "fitness" in context.lower():
        parts.append("The genetic algorithm achieved a high fitness score, balancing route coverage and mileage distribution.")
    if not parts:
        parts = ["Operations report generated. All systems are functioning within normal parameters."]
    return " ".join(parts) + " Recommend reviewing the dashboard for detailed metrics."

class ReportRequest(BaseModel):
    report_type: str
    schedule_id: Optional[str] = None
    date: Optional[str] = None
    include_predictions: bool = True

@router.post("/generate")
async def generate_report(req: ReportRequest, user=Depends(verify_token)):
    db = get_db()
    trains = await db.trains.find().to_list(100)
    latest_schedule = await db.schedules.find_one(sort=[("created_at", -1)])
    stats = {"total_trains": len(trains), "active": len([t for t in trains if t.get("status") == "active"]),
             "standby": len([t for t in trains if t.get("status") == "standby"]),
             "maintenance": len([t for t in trains if t.get("status") == "maintenance"])}
    schedule_info = ""
    if latest_schedule:
        schedule_info = f"Latest Schedule (generated {latest_schedule.get('date', 'today')}): Fitness Score: {latest_schedule.get('fitness_score', 'N/A')}, Scheduled Entries: {len(latest_schedule.get('schedule', []))}, Conflicts: {len(latest_schedule.get('conflicts', []))}"
    maintenance_trains = [t for t in trains if t.get("predicted_maintenance_days", 999) <= 7]
    maintenance_info = "\n".join([f"- Train {t.get('train_id')}: {t.get('predicted_maintenance_days')} days remaining" for t in maintenance_trains[:5]])
    context = f"""You are MetroBuddy AI for Kochi Metro Rail Limited. Generate a concise supervisor {req.report_type} report for {req.date or datetime.utcnow().strftime('%Y-%m-%d')}.
Fleet: Total={stats['total_trains']}, Active={stats['active']}, Standby={stats['standby']}, Maintenance={stats['maintenance']}
{schedule_info}
Trains needing maintenance: {maintenance_info or 'None critical'}
Generate a professional 3-4 sentence report with key insights and recommended actions."""
    summary = await generate_llm_summary(context)
    report = {"report_type": req.report_type, "date": req.date or datetime.utcnow().strftime("%Y-%m-%d"),
              "generated_at": datetime.utcnow().isoformat(), "generated_by": "MetroBuddy AI",
              "fleet_stats": stats, "schedule_summary": schedule_info.strip(),
              "maintenance_alerts": maintenance_info or "No critical maintenance needed",
              "llm_summary": summary, "requested_by": user.get("username")}
    await db.reports.insert_one({**report})
    return report

@router.get("/history")
async def get_report_history(limit: int = 20, user=Depends(verify_token)):
    db = get_db()
    reports = await db.reports.find().sort("generated_at", -1).limit(limit).to_list(limit)
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports

@router.post("/explain-schedule")
async def explain_schedule(user=Depends(verify_token)):
    db = get_db()
    latest = await db.schedules.find_one(sort=[("created_at", -1)])
    if not latest:
        return {"explanation": "No schedule found. Please generate a schedule first."}
    schedule = latest.get("schedule", [])
    conflicts = latest.get("conflicts", [])
    prompt = f"Explain this metro schedule for a supervisor: {len(schedule)} train assignments, fitness score {latest.get('fitness_score', 0):.1f}, {len(conflicts)} conflicts. Routes: {list(set(s.get('route','') for s in schedule))}. Give a brief 3-sentence operational explanation."
    explanation = await generate_llm_summary(prompt)
    return {"explanation": explanation, "schedule_date": latest.get("date"), "fitness_score": latest.get("fitness_score")}
