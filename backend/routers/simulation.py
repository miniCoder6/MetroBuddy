from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from database import get_db
from routers.auth import verify_token
from routers.schedule import (constraint_programming_filter, genetic_algorithm,
                               conflict_check, evaluate_schedule, DEFAULT_ROUTES)
router = APIRouter()

class SimulationParams(BaseModel):
    scenario_name: str = "What-If Scenario"
    modified_params: Dict[str, Any] = {}
    disabled_trains: Optional[List[str]] = []
    extra_trains: Optional[int] = 0
    peak_hours: Optional[bool] = False
    emergency_mode: Optional[bool] = False
    constraints_override: Optional[Dict] = {}
    ga_params_override: Optional[Dict] = {}
    routes_override: Optional[List[Dict]] = None

@router.post("/run")
async def run_simulation(params: SimulationParams, user=Depends(verify_token)):
    import time as time_module
    db = get_db()
    start = time_module.time()
    trains = await db.trains.find().to_list(100)
    sim_trains = []
    for train in trains:
        if train.get("train_id") in (params.disabled_trains or []):
            continue
        if params.emergency_mode and train.get("status") == "standby":
            train = {**train, "status": "active"}
        sim_trains.append(train)
    routes = params.routes_override or DEFAULT_ROUTES
    if params.peak_hours:
        peak_routes = []
        for r in routes:
            peak_routes.append(r)
            peak_routes.append({**r, "name": r["name"] + " (Peak)",
                                 "start_time": r["start_time"][:2] + ":30",
                                 "end_time": r["end_time"][:2] + ":30"})
        routes = peak_routes
    constraints = {"max_mileage": 500000, "maintenance_threshold": 2, **params.constraints_override}
    ga_params = {"population_size": 15, "generations": 20, "cx_prob": 0.7, "mut_prob": 0.1,
                 "weights": {"optimal_mileage": 300000, "delay_threshold": 5}, **params.ga_params_override}
    feasible = constraint_programming_filter(sim_trains, routes, constraints)
    best_schedule = genetic_algorithm(feasible, routes, ga_params)
    conflicts = conflict_check(best_schedule)
    fitness = evaluate_schedule(best_schedule, routes, ga_params.get("weights", {}))
    elapsed = (time_module.time() - start) * 1000
    coverage_pct = len(best_schedule) / len(routes) * 100 if routes else 0
    result = {"scenario_name": params.scenario_name, "schedule": best_schedule, "conflicts": conflicts,
              "fitness_score": round(fitness, 2), "generation_time_ms": round(elapsed, 2),
              "trains_available": len(sim_trains), "trains_scheduled": len(best_schedule),
              "routes_total": len(routes), "coverage_percentage": round(coverage_pct, 1),
              "conflict_count": len(conflicts), "simulation_params": params.dict(),
              "created_at": datetime.utcnow().isoformat()}
    await db.simulations.insert_one({**result, "created_by": user.get("username")})
    return result

@router.get("/history")
async def get_simulation_history(limit: int = 10, user=Depends(verify_token)):
    db = get_db()
    sims = await db.simulations.find().sort("created_at", -1).limit(limit).to_list(limit)
    for s in sims:
        s["_id"] = str(s["_id"])
    return sims

@router.post("/compare")
async def compare_simulations(sim_ids: List[str], user=Depends(verify_token)):
    db = get_db()
    from bson import ObjectId
    results = []
    for sid in sim_ids:
        try:
            sim = await db.simulations.find_one({"_id": ObjectId(sid)})
            if sim:
                sim["_id"] = str(sim["_id"])
                results.append(sim)
        except:
            pass
    if len(results) < 2:
        return {"error": "Need at least 2 valid simulation IDs"}
    return {"sim_a": results[0], "sim_b": results[1],
            "delta": {"fitness_score": results[1]["fitness_score"] - results[0]["fitness_score"],
                      "coverage": results[1]["coverage_percentage"] - results[0]["coverage_percentage"],
                      "conflicts": results[1]["conflict_count"] - results[0]["conflict_count"],
                      "trains_scheduled": results[1]["trains_scheduled"] - results[0]["trains_scheduled"]}}
