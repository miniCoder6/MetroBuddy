from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/metrobuddy")

async_client = AsyncIOMotorClient(MONGO_URI)
async_db = async_client.metrobuddy

sync_client = MongoClient(MONGO_URI)
sync_db = sync_client.metrobuddy

def get_db():
    return async_db
