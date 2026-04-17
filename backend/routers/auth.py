from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt, bcrypt, os
from datetime import datetime, timedelta
from database import get_db

router = APIRouter()
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "metrobuddy_secret_2025")

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "supervisor"

def create_token(user_id, username, role):
    payload = {"sub": user_id, "username": username, "role": role,
               "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login")
async def login(req: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"username": req.username})
    if not user or not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(str(user["_id"]), user["username"], user.get("role", "supervisor"))
    return {"token": token, "username": user["username"], "role": user.get("role", "supervisor")}

@router.post("/register")
async def register(req: RegisterRequest):
    db = get_db()
    if await db.users.find_one({"username": req.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    result = await db.users.insert_one({"username": req.username, "password": hashed,
                                         "role": req.role, "created_at": datetime.utcnow()})
    token = create_token(str(result.inserted_id), req.username, req.role)
    return {"token": token, "username": req.username, "role": req.role}

@router.get("/me")
async def get_me(user=Depends(verify_token)):
    return user
