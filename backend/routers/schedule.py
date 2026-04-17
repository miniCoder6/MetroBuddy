from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import random
from database import get_db
from routers.auth import verify_token

router = APIRouter()

DEFAULT_ROUTES = [
    {"name": "Aluva - Petta", "start_time": "06:00", "end_time": "07:30", "distance_km": 25.6},
    {"name": "Petta - Aluva", "start_time": "07:00", "end_time": "08:30", "distance_km": 25.6},
    {"name": "Aluva - SN Junction", "start_time": "08:00", "end_time": "09:00", "distance_km": 16.2},
    {"name": "SN Junction - Aluva", "start_time": "09:15", "end_time": "10:15", "distance_km": 16.2},
    {"name": "Petta - Maharajas", "start_time": "10:00", "end_time": "11:00", "distance_km": 12.8},
    {"name": "Maharajas - Petta", "start_time": "11:00", "end_time": "12:00", "distance_km": 12.8},
    {"name": "Aluva - Edapally", "start_time": "12:00", "end_time": "12:45", "distance_km": 9.4},
    {"name": "Edapally - Petta", "start_time": "13:00", "end_time": "14:00", "distance_km": 18.1},
]

def constraint_programming_filter(trains, routes, constraints):
    feasible = []
    assigned = set()
    for train in trains:
        if train.get("status") in ["maintenance", "ibl"]:
            continue
        if train["train_id"] in assigned:
            continue
        if train.get("mileage", 0) > constraints.get("max_mileage", 500000):
            continue
        maintenance_days = train.get("predicted_maintenance_days", 999)
        if maintenance_days <= constraints.get("maintenance_threshold", 2):
            train = {**train, "forced_standby": True}
        feasible.append(train)
        assigned.add(train["train_id"])
    return feasible

def evaluate_schedule(individual, routes, weights):
    score = 0.0
    used_trains = set()
    for assignment in individual:
        train_id = assignment.get("train_id")
        if train_id in used_trains:
            score -= 100
        else:
            used_trains.add(train_id)
            score += 10
        mileage = assignment.get("mileage", 0)
        if mileage < weights.get("optimal_mileage", 300000):
            score += 5
        delay_avg = sum(assignment.get("delay_history", [0])) / max(len(assignment.get("delay_history", [1])), 1)
        if delay_avg < weights.get("delay_threshold", 5):
            score += 3
    return score

def crossover(parent1, parent2):
    if len(parent1) < 2:
        return parent1[:], parent2[:]
    point = random.randint(1, len(parent1) - 1)
    return parent1[:point] + parent2[point:], parent2[:point] + parent1[point:]

def mutate(individual, trains, mutation_rate=0.1):
    for i in range(len(individual)):
        if random.random() < mutation_rate:
            replacement = random.choice(trains)
            individual[i] = {**individual[i], "train_id": replacement["train_id"],
                             "mileage": replacement.get("mileage", 0),
                             "delay_history": replacement.get("delay_history", [])}
    return individual

def genetic_algorithm(feasible_trains, routes, ga_params):
    pop_size = ga_params.get("population_size", 20)
    generations = ga_params.get("generations", 30)
    cx_prob = ga_params.get("cx_prob", 0.7)
    mut_prob = ga_params.get("mut_prob", 0.1)
    weights = ga_params.get("weights", {})
    if not feasible_trains or not routes:
        return []

    def create_individual():
        trains_copy = feasible_trains[:]
        random.shuffle(trains_copy)
        individual = []
        for i, route in enumerate(routes):
            if i < len(trains_copy):
                t = trains_copy[i]
                individual.append({
                    "train_id": t["train_id"],
                    "route": route["name"],
                    "departure": route["start_time"],
                    "arrival": route["end_time"],
                    "status": "active" if not t.get("forced_standby") else "standby",
                    "mileage": t.get("mileage", 0),
                    "delay_history": t.get("delay_history", []),
                    "predicted_maintenance_days": t.get("predicted_maintenance_days", 30)
                })
        return individual

    population = [create_individual() for _ in range(pop_size)]
    hall_of_fame = []

    for gen in range(generations):
        scored = [(ind, evaluate_schedule(ind, routes, weights)) for ind in population]
        scored.sort(key=lambda x: x[1], reverse=True)
        if not hall_of_fame or scored[0][1] > evaluate_schedule(hall_of_fame[0], routes, weights):
            hall_of_fame = [scored[0][0]]
        selected = []
        for _ in range(pop_size):
            competitors = random.sample(scored, min(3, len(scored)))
            winner = max(competitors, key=lambda x: x[1])[0]
            selected.append(winner[:])
        next_gen = []
        for i in range(0, len(selected) - 1, 2):
            if random.random() < cx_prob and len(selected[i]) == len(selected[i+1]):
                c1, c2 = crossover(selected[i], selected[i+1])
                next_gen.extend([c1, c2])
            else:
                next_gen.extend([selected[i], selected[i+1]])
        population = [mutate(ind, feasible_trains, mut_prob) for ind in next_gen]

    return hall_of_fame[0] if hall_of_fame else population[0]

def conflict_check(schedule):
    conflicts = []
    train_counts = {}
    for entry in schedule:
        tid = entry.get("train_id")
        train_counts[tid] = train_counts.get(tid, 0) + 1
    for tid, count in train_counts.items():
        if count > 1:
            conflicts.append({"type": "duplicate_assignment", "train_id": tid, "count": count})
    return conflicts

class ScheduleRequest(BaseModel):
    date: Optional[str] = None
    constraints: Optional[Dict] = {}
    ga_params: Optional[Dict] = {}
    routes: Optional[List[Dict]] = None

@router.post("/generate")
async def generate_schedule(req: ScheduleRequest, user=Depends(verify_token)):
    import time as time_module
    db = get_db()
    start = time_module.time()
    trains = await db.trains.find().to_list(100)
    for train in trains:
        if "predicted_maintenance_days" not in train:
            train["predicted_maintenance_days"] = random.randint(1, 60)
    constraints = {"max_mileage": 500000, "maintenance_threshold": 2, **req.constraints}
    ga_params = {"population_size": 20, "generations": 30, "cx_prob": 0.7, "mut_prob": 0.1,
                 "weights": {"optimal_mileage": 300000, "delay_threshold": 5}, **req.ga_params}
    routes = req.routes or DEFAULT_ROUTES
    feasible = constraint_programming_filter(trains, routes, constraints)
    best_schedule = genetic_algorithm(feasible, routes, ga_params)
    conflicts = conflict_check(best_schedule)
    fitness = evaluate_schedule(best_schedule, routes, ga_params.get("weights", {}))
    elapsed = (time_module.time() - start) * 1000
    doc = {"date": req.date or datetime.utcnow().strftime("%Y-%m-%d"), "schedule": best_schedule,
           "conflicts": conflicts, "fitness_score": fitness, "generation_time_ms": elapsed,
           "created_at": datetime.utcnow(), "created_by": user.get("username")}
    await db.schedules.insert_one(doc)
    return {"schedule": best_schedule, "conflicts": conflicts, "fitness_score": round(fitness, 2),
            "generation_time_ms": round(elapsed, 2), "feasible_trains": len(feasible), "total_trains": len(trains)}

@router.get("/history")
async def get_schedule_history(limit: int = 10, user=Depends(verify_token)):
    db = get_db()
    schedules = await db.schedules.find().sort("created_at", -1).limit(limit).to_list(limit)
    for s in schedules:
        s["_id"] = str(s["_id"])
    return schedules

@router.get("/latest")
async def get_latest_schedule(user=Depends(verify_token)):
    db = get_db()
    schedule = await db.schedules.find_one(sort=[("created_at", -1)])
    if not schedule:
        return {"schedule": [], "conflicts": [], "fitness_score": 0}
    schedule["_id"] = str(schedule["_id"])
    return schedule
