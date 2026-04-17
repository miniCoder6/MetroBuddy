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

class TrainCreate(BaseModel):
    train_id: str
    name: str
    route: Optional[str] = ""
    status: str = "active"
    mileage: float = 0.0
    depot: Optional[str] = "Muttom Depot"
    capacity: Optional[int] = 400
    manufactured_year: Optional[int] = 2018
    service_frequency: Optional[float] = 10.0
    maintenance_logs: Optional[int] = 0
    delay_history: Optional[List[float]] = []

class TrainUpdate(BaseModel):
    route: Optional[str] = None
    status: Optional[str] = None
    mileage: Optional[float] = None
    depot: Optional[str] = None

@router.get("/")
async def get_trains(status: Optional[str] = None, user=Depends(verify_token)):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    trains = await db.trains.find(query).to_list(200)
    return [serialize(t) for t in trains]

@router.get("/stats")
async def get_train_stats(user=Depends(verify_token)):
    db = get_db()
    total = await db.trains.count_documents({})
    active = await db.trains.count_documents({"status": "active"})
    standby = await db.trains.count_documents({"status": "standby"})
    maintenance = await db.trains.count_documents({"status": "maintenance"})
    ibl = await db.trains.count_documents({"status": "ibl"})
    critical = await db.trains.count_documents({"maintenance_urgency": "critical"})
    return {
        "total": total, "active": active, "standby": standby,
        "maintenance": maintenance, "ibl": ibl, "critical_maintenance": critical
    }

@router.get("/{train_id}")
async def get_train(train_id: str, user=Depends(verify_token)):
    db = get_db()
    train = await db.trains.find_one({"train_id": train_id})
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    return serialize(train)

@router.post("/")
async def create_train(train: TrainCreate, user=Depends(verify_token)):
    db = get_db()
    if await db.trains.find_one({"train_id": train.train_id}):
        raise HTTPException(status_code=400, detail="Train ID already exists")
    doc = train.dict()
    doc["created_at"] = datetime.utcnow()
    doc["predicted_maintenance_days"] = 30
    doc["maintenance_urgency"] = "good"
    result = await db.trains.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.put("/{train_id}")
async def update_train(train_id: str, update: TrainUpdate, user=Depends(verify_token)):
    db = get_db()
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.utcnow()
    result = await db.trains.update_one({"train_id": train_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Train not found")
    train = await db.trains.find_one({"train_id": train_id})
    return serialize(train)

@router.delete("/{train_id}")
async def delete_train(train_id: str, user=Depends(verify_token)):
    db = get_db()
    result = await db.trains.delete_one({"train_id": train_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Train not found")
    return {"message": "Train deleted"}
