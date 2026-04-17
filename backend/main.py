from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, trains, schedule, maintenance, simulation, reports, alerts
import os

app = FastAPI(title="MetroBuddy API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(trains.router, prefix="/api/trains", tags=["trains"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["maintenance"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])

@app.get("/")
def root():
    return {"status": "MetroBuddy API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
