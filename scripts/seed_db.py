"""
Seed script: populates MongoDB with sample Kochi Metro data
Run: python scripts/seed_db.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from pymongo import MongoClient
import bcrypt, random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/metrobuddy")
client = MongoClient(MONGO_URI)
db = client.metrobuddy

KOCHI_ROUTES = ["Aluva - Petta","Petta - Aluva","Aluva - SN Junction",
                "SN Junction - Aluva","Petta - Maharajas","Maharajas - Petta",
                "Aluva - Edapally","Edapally - Aluva"]
TRAIN_IDS = [f"MB-{100+i}" for i in range(1, 25)]

def seed_users():
    db.users.delete_many({})
    users = [
        {"username": "admin", "password": bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(), "role": "admin"},
        {"username": "supervisor", "password": bcrypt.hashpw(b"super123", bcrypt.gensalt()).decode(), "role": "supervisor"},
        {"username": "planner", "password": bcrypt.hashpw(b"plan123", bcrypt.gensalt()).decode(), "role": "planner"},
    ]
    for u in users:
        u["created_at"] = datetime.utcnow()
    db.users.insert_many(users)
    print(f"✓ Seeded {len(users)} users")

def seed_trains():
    db.trains.delete_many({})
    statuses = ["active"] * 16 + ["standby"] * 4 + ["maintenance"] * 2 + ["ibl"] * 2
    random.shuffle(statuses)
    trains = []
    for i, tid in enumerate(TRAIN_IDS):
        mileage = random.uniform(50000, 550000)
        delay_history = [random.uniform(0, 20) for _ in range(random.randint(5, 30))]
        maintenance_logs = random.randint(0, 40)
        manufactured_year = random.randint(2014, 2022)
        pred_days = max(1, int(100 - mileage/8000 - sum(delay_history)/len(delay_history)*2 - maintenance_logs*0.5 + random.gauss(0,5)))
        pred_days = min(90, max(1, pred_days))
        urgency = "critical" if pred_days <= 3 else "warning" if pred_days <= 10 else "moderate" if pred_days <= 20 else "good"
        trains.append({
            "train_id": tid, "name": f"Kochi Metro {tid}",
            "route": random.choice(KOCHI_ROUTES), "status": statuses[i],
            "mileage": round(mileage, 2),
            "last_maintenance": (datetime.utcnow() - timedelta(days=random.randint(5,180))).strftime("%Y-%m-%d"),
            "delay_history": [round(d, 2) for d in delay_history],
            "maintenance_logs": maintenance_logs,
            "depot": random.choice(["Muttom Depot", "Aluva Depot", "Petta Stabling"]),
            "capacity": random.choice([400, 450, 380]),
            "manufactured_year": manufactured_year,
            "service_frequency": round(random.uniform(5, 18), 2),
            "predicted_maintenance_days": pred_days, "maintenance_urgency": urgency,
            "created_at": datetime.utcnow()
        })
    db.trains.insert_many(trains)
    print(f"✓ Seeded {len(trains)} trains")

def seed_maintenance_logs():
    db.maintenance_logs.delete_many({})
    descs = ["Wheelset inspection and bearing replacement","HVAC system servicing",
             "Pantograph inspection","Brake pad replacement","Door mechanism calibration",
             "Electrical system diagnostics","Bogey inspection and lubrication","Fire suppression check"]
    logs = []
    for _ in range(60):
        tid = random.choice(TRAIN_IDS)
        logs.append({
            "train_id": tid, "type": random.choice(["scheduled","inspection","unscheduled","overhaul"]),
            "description": random.choice(descs),
            "performed_at": (datetime.utcnow() - timedelta(days=random.randint(1,90))).strftime("%Y-%m-%d"),
            "technician": random.choice(["Rajesh Kumar","Priya Nair","Arun Menon","Deepa Pillai"]),
            "parts_replaced": random.sample(["brake pads","bearings","HVAC filter","door sensor"], random.randint(0,3)),
            "cost": round(random.uniform(5000, 150000), 2), "created_at": datetime.utcnow()
        })
    db.maintenance_logs.insert_many(logs)
    print(f"✓ Seeded {len(logs)} maintenance logs")

def seed_alerts():
    db.alerts.delete_many({})
    alerts = [
        {"type":"safety","severity":"critical","title":"Train MB-302 Door Malfunction","message":"Door sensors on coach 3 reported anomaly. Immediate inspection required.","train_id":"MB-302","resolved":False},
        {"type":"resource","severity":"warning","title":"Low Stock: Type-B Brake Pads","message":"Inventory at 15%. Reorder needed within 3 days.","resolved":False},
        {"type":"maintenance","severity":"critical","title":"MB-115 Maintenance Overdue","message":"Scheduled 10,000 km service overdue by 850 km. Remove from service.","train_id":"MB-115","resolved":False},
        {"type":"scheduling","severity":"warning","title":"Peak Hour Coverage Gap","message":"Evening peak (17:00-19:00) insufficient coverage on Aluva-Petta line.","resolved":False},
        {"type":"data","severity":"info","title":"Telemetry Sync Delay","message":"Train MB-205 telemetry showing 12-minute delay. Monitoring.","train_id":"MB-205","resolved":False},
        {"type":"maintenance","severity":"warning","title":"MB-204 HVAC Check Due","message":"HVAC service due in 12 days. Schedule during off-peak.","train_id":"MB-204","resolved":False},
    ]
    for a in alerts:
        a["created_at"] = datetime.utcnow()
    db.alerts.insert_many(alerts)
    print(f"✓ Seeded {len(alerts)} alerts")

if __name__ == "__main__":
    print("🚇 Seeding MetroBuddy database...")
    seed_users()
    seed_trains()
    seed_maintenance_logs()
    seed_alerts()
    print("\n✅ Database seeded successfully!")
    print("\nLogin credentials:")
    print("  admin / admin123")
    print("  supervisor / super123")
    print("  planner / plan123")
