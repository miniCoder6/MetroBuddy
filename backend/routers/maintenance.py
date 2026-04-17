from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import get_db
from routers.auth import verify_token

router = APIRouter()

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    return doc

class MaintenanceLog(BaseModel):
    train_id: str
    type: str
    description: str
    performed_at: Optional[str] = None
    technician: Optional[str] = None
    parts_replaced: Optional[List[str]] = []
    cost: Optional[float] = 0.0

def predict_maintenance_local(train_data: dict) -> dict:
    import math
    mileage = train_data.get("mileage", 0)
    delay_history = train_data.get("delay_history", [0])
    avg_delay = sum(delay_history) / max(len(delay_history), 1)
    maintenance_logs = train_data.get("maintenance_logs", 0)
    manufactured_year = train_data.get("manufactured_year", 2018)
    age_years = 2025 - manufactured_year
    service_frequency = train_data.get("service_frequency", 10)
    days = 100 - (mileage / 10000) - (avg_delay * 2) - (maintenance_logs * 0.5) - (age_years * 3) + (service_frequency * 0.2)
    days = max(1, int(round(min(90, max(1, days)))))
    if days <= 3:
        urgency, color = "critical", "red"
    elif days <= 10:
        urgency, color = "warning", "orange"
    elif days <= 20:
        urgency, color = "moderate", "yellow"
    else:
        urgency, color = "good", "green"
    return {"predicted_days": days, "urgency": urgency, "color": color,
            "features_used": {"mileage": mileage, "avg_delay_minutes": round(avg_delay, 2),
                              "maintenance_logs": maintenance_logs, "age_years": age_years}}

@router.get("/predictions")
async def get_predictions(user=Depends(verify_token)):
    db = get_db()
    trains = await db.trains.find().to_list(100)
    if not trains:
        return []
    results = []
    for train in trains:
        pred = predict_maintenance_local(train)
        await db.trains.update_one({"train_id": train["train_id"]},
            {"$set": {"predicted_maintenance_days": pred["predicted_days"], "maintenance_urgency": pred["urgency"]}})
        results.append({"train_id": train.get("train_id"), "name": train.get("name"), **pred})
    return sorted(results, key=lambda x: x["predicted_days"])

@router.get("/predict/{train_id}")
async def predict_for_train(train_id: str, user=Depends(verify_token)):
    db = get_db()
    train = await db.trains.find_one({"train_id": train_id})
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    prediction = predict_maintenance_local(train)
    return {**prediction, "train_id": train_id, "name": train.get("name")}

@router.get("/logs")
async def get_maintenance_logs(limit: int = 50, user=Depends(verify_token)):
    db = get_db()
    logs = await db.maintenance_logs.find().sort("created_at", -1).limit(limit).to_list(limit)
    return [serialize(l) for l in logs]

@router.post("/logs")
async def add_maintenance_log(log: MaintenanceLog, user=Depends(verify_token)):
    db = get_db()
    doc = log.dict()
    doc["created_at"] = datetime.utcnow()
    doc["created_by"] = user.get("username")
    result = await db.maintenance_logs.insert_one(doc)
    await db.trains.update_one({"train_id": log.train_id},
        {"$inc": {"maintenance_logs": 1}, "$set": {"last_maintenance": doc["performed_at"] or datetime.utcnow().strftime("%Y-%m-%d")}})
    doc["_id"] = str(result.inserted_id)
    return doc

@router.get("/upcoming")
async def get_upcoming_maintenance(days_threshold: int = 14, user=Depends(verify_token)):
    db = get_db()
    trains = await db.trains.find({"predicted_maintenance_days": {"$lte": days_threshold}}).sort("predicted_maintenance_days", 1).to_list(20)
    return [serialize(t) for t in trains]

@router.get("/stats")
async def get_maintenance_stats(user=Depends(verify_token)):
    db = get_db()
    total_logs = await db.maintenance_logs.count_documents({})
    critical = await db.trains.count_documents({"maintenance_urgency": "critical"})
    warning = await db.trains.count_documents({"maintenance_urgency": "warning"})
    return {"total_maintenance_logs": total_logs, "critical_trains": critical,
            "warning_trains": warning, "health_score": max(0, 100 - critical * 20 - warning * 5)}
