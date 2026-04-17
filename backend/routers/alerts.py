from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from routers.auth import verify_token
router = APIRouter()

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

class Alert(BaseModel):
    type: str
    severity: str
    title: str
    message: str
    train_id: Optional[str] = None
    resolved: bool = False

@router.get("/")
async def get_alerts(resolved: bool = False, user=Depends(verify_token)):
    db = get_db()
    alerts = await db.alerts.find({"resolved": resolved}).sort("created_at", -1).limit(50).to_list(50)
    return [serialize(a) for a in alerts]

@router.post("/")
async def create_alert(alert: Alert, user=Depends(verify_token)):
    db = get_db()
    doc = alert.dict()
    doc["created_at"] = datetime.utcnow()
    doc["created_by"] = user.get("username")
    result = await db.alerts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.post("/resolve/{alert_id}")
async def resolve_alert(alert_id: str, user=Depends(verify_token)):
    db = get_db()
    from bson import ObjectId
    await db.alerts.update_one({"_id": ObjectId(alert_id)},
        {"$set": {"resolved": True, "resolved_by": user.get("username"), "resolved_at": datetime.utcnow()}})
    return {"message": "Alert resolved"}

@router.post("/auto-generate")
async def auto_generate_alerts(user=Depends(verify_token)):
    db = get_db()
    trains = await db.trains.find().to_list(100)
    new_alerts = []
    for train in trains:
        days = train.get("predicted_maintenance_days", 999)
        if days <= 2:
            existing = await db.alerts.find_one({"train_id": train.get("train_id"), "severity": "critical", "resolved": False})
            if not existing:
                alert = {"type": "maintenance", "severity": "critical",
                         "title": f"Critical: Train {train.get('train_id')} Needs Immediate Maintenance",
                         "message": f"Only {days} days until maintenance due. Remove from active service.",
                         "train_id": train.get("train_id"), "resolved": False, "created_at": datetime.utcnow()}
                result = await db.alerts.insert_one(alert)
                alert["_id"] = str(result.inserted_id)
                new_alerts.append(alert)
        elif days <= 7:
            existing = await db.alerts.find_one({"train_id": train.get("train_id"), "severity": "warning", "resolved": False})
            if not existing:
                alert = {"type": "maintenance", "severity": "warning",
                         "title": f"Warning: Train {train.get('train_id')} Maintenance Due Soon",
                         "message": f"{days} days remaining before scheduled maintenance.",
                         "train_id": train.get("train_id"), "resolved": False, "created_at": datetime.utcnow()}
                result = await db.alerts.insert_one(alert)
                alert["_id"] = str(result.inserted_id)
                new_alerts.append(alert)
    latest_schedule = await db.schedules.find_one(sort=[("created_at", -1)])
    if latest_schedule and latest_schedule.get("conflicts"):
        existing = await db.alerts.find_one({"type": "scheduling", "resolved": False})
        if not existing:
            alert = {"type": "scheduling", "severity": "warning", "title": "Schedule Conflicts Detected",
                     "message": f"{len(latest_schedule['conflicts'])} conflicts in latest schedule.",
                     "resolved": False, "created_at": datetime.utcnow()}
            result = await db.alerts.insert_one(alert)
            alert["_id"] = str(result.inserted_id)
            new_alerts.append(alert)
    return {"generated": len(new_alerts), "alerts": new_alerts}

@router.get("/stats")
async def get_alert_stats(user=Depends(verify_token)):
    db = get_db()
    return {
        "total": await db.alerts.count_documents({"resolved": False}),
        "critical": await db.alerts.count_documents({"severity": "critical", "resolved": False}),
        "warning": await db.alerts.count_documents({"severity": "warning", "resolved": False}),
        "info": await db.alerts.count_documents({"severity": "info", "resolved": False})
    }
