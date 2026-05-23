from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator


# ----------------------------------------------------------------------------
# Config / DB
# ----------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@agroconnect.in").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
JWT_ALG = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="AgroConnect API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("agroconnect")


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(uid: str, email: str) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
Category = Literal["seeds", "fertilizers", "pesticides", "equipment"]
INDIAN_PHONE_RE = re.compile(r"^(?:\+?91[\s-]?)?[6-9]\d{9}$")


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not INDIAN_PHONE_RE.match(cleaned):
            raise ValueError("Enter a valid Indian phone number (10 digits, starts 6-9)")
        return cleaned


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    email: EmailStr
    role: str
    created_at: str


class AuthOut(BaseModel):
    user: UserOut
    token: str


class AgroShopIn(BaseModel):
    name: str = Field(min_length=2)
    category: Category
    contact: str
    location: str
    description: Optional[str] = ""


class AgroShopOut(AgroShopIn):
    id: str
    created_at: str


class ChatIn(BaseModel):
    text: Optional[str] = ""
    image: Optional[str] = None  # base64 data URL


class ChatOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    text: Optional[str] = ""
    image: Optional[str] = None
    created_at: str


# ----------------------------------------------------------------------------
# Startup: indexes + seed
# ----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.agroshops.create_index("category")
    await db.chat_messages.create_index("created_at")

    # seed/update admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if admin is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "phone": "+91 9000000000",
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": now_iso(),
        })
    else:
        # always keep admin password in sync with .env, and ensure role
        updates = {}
        if not verify_password(ADMIN_PASSWORD, admin["password_hash"]):
            updates["password_hash"] = hash_password(ADMIN_PASSWORD)
        if admin.get("role") != "admin":
            updates["role"] = "admin"
        if updates:
            await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": updates})

    # seed a sample farmer
    farmer_email = "ravi@agroconnect.in"
    if not await db.users.find_one({"email": farmer_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Ravi Kumar",
            "phone": "9000000001",
            "email": farmer_email,
            "password_hash": hash_password("Farm@123"),
            "role": "farmer",
            "created_at": now_iso(),
        })

    # seed agroshops
    if await db.agroshops.count_documents({}) == 0:
        samples = [
            ("Green Earth Seeds Hub", "seeds", "+91 98220 11122", "Nashik, Maharashtra", "Hybrid F1 vegetable & cereal seeds. Govt-certified."),
            ("Kisan Bhandar Seeds", "seeds", "+91 90011 22334", "Jodhpur, Rajasthan", "Drought-resistant millet, bajra & moong seeds."),
            ("Krishi Urea Depot", "fertilizers", "+91 98765 43210", "Indore, MP", "Urea, DAP, NPK & micronutrient mixes."),
            ("OrganicGrow Fertilizers", "fertilizers", "+91 91234 56789", "Bengaluru, Karnataka", "100% organic vermicompost & jeevamrut."),
            ("SafeFarm Crop Care", "pesticides", "+91 99887 00112", "Pune, Maharashtra", "Neem-based & bio-pesticides. Spray equipment."),
            ("AgriShield Pesticides", "pesticides", "+91 90909 80808", "Hyderabad, Telangana", "Approved insecticides, fungicides, herbicides."),
            ("Maruti Tractors & Tools", "equipment", "+91 90111 22244", "Coimbatore, TN", "Tractors, tillers, sprayers — new & used."),
            ("FarmTech Equipment", "equipment", "+91 92345 67890", "Ludhiana, Punjab", "Harvesters, threshers, drip irrigation kits."),
        ]
        docs = []
        for name, cat, contact, loc, desc in samples:
            docs.append({
                "id": str(uuid.uuid4()),
                "name": name,
                "category": cat,
                "contact": contact,
                "location": loc,
                "description": desc,
                "created_at": now_iso(),
            })
        await db.agroshops.insert_many(docs)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Auth
# ----------------------------------------------------------------------------
def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "phone": u.get("phone", ""),
        "email": u["email"],
        "role": u.get("role", "farmer"),
        "created_at": u.get("created_at", now_iso()),
    }


@api.get("/")
async def root():
    return {"app": "AgroConnect", "ok": True}


@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    if email == ADMIN_EMAIL:
        raise HTTPException(400, "This email is reserved")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "phone": body.phone,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "farmer",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    return {"user": public_user(user), "token": create_token(user["id"], email)}


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"user": public_user(user), "token": create_token(user["id"], email)}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ----------------------------------------------------------------------------
# AgroShops
# ----------------------------------------------------------------------------
@api.get("/agroshops", response_model=List[AgroShopOut])
async def list_shops(category: Optional[str] = None):
    qry = {}
    if category and category != "all":
        qry["category"] = category
    items = await db.agroshops.find(qry, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/agroshops", response_model=AgroShopOut)
async def create_shop(body: AgroShopIn, _: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_iso()})
    insert = doc.copy()
    await db.agroshops.insert_one(insert)
    return doc


@api.delete("/agroshops/{shop_id}")
async def delete_shop(shop_id: str, _: dict = Depends(require_admin)):
    res = await db.agroshops.delete_one({"id": shop_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ----------------------------------------------------------------------------
# Group chat
# ----------------------------------------------------------------------------
@api.get("/chat", response_model=List[ChatOut])
async def chat_history(limit: int = 200, _: dict = Depends(get_current_user)):
    items = await db.chat_messages.find({}, {"_id": 0}).sort("created_at", 1).to_list(max(1, min(limit, 1000)))
    return items


@api.post("/chat", response_model=ChatOut)
async def chat_send(body: ChatIn, user: dict = Depends(get_current_user)):
    text = (body.text or "").strip()
    image = body.image
    if not text and not image:
        raise HTTPException(400, "Message is empty")
    if image and not image.startswith("data:image/"):
        raise HTTPException(400, "Image must be a data URL (data:image/...;base64,...)")
    if image and len(image) > 1_500_000:  # ~1.1MB limit
        raise HTTPException(400, "Image too large (max ~1MB)")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "text": text,
        "image": image,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(doc.copy())
    return doc


@api.delete("/chat/{msg_id}")
async def chat_delete(msg_id: str, user: dict = Depends(get_current_user)):
    m = await db.chat_messages.find_one({"id": msg_id})
    if not m:
        raise HTTPException(404, "Not found")
    if m["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your message")
    await db.chat_messages.delete_one({"id": msg_id})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Wire up
# ----------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
