from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ----------------------------------------------------------------------------
# Config / DB
# ----------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="AgroConnect API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("agroconnect")


# ----------------------------------------------------------------------------
# Auth utils
# ----------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(uid: str, email: str) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(uid: str) -> str:
    payload = {
        "sub": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=7 * 24 * 3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=30 * 24 * 3600, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
Role = Literal["farmer", "buyer"]
Category = Literal["seeds", "fertilizers", "pesticides", "equipment"]


class RegisterIn(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Role = "farmer"
    location: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    email: EmailStr
    role: Role
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    created_at: str


class AuthOut(BaseModel):
    user: UserOut
    token: str


class ListingIn(BaseModel):
    title: str
    category: Category
    price: float
    unit: str = "kg"  # e.g. kg, quintal, piece, litre
    quantity: float
    location: str
    description: Optional[str] = ""
    image: Optional[str] = None


class ListingOut(ListingIn):
    id: str
    seller_id: str
    seller_name: str
    seller_phone: str
    created_at: str


class PostIn(BaseModel):
    content: str
    image: Optional[str] = None


class PostOut(BaseModel):
    id: str
    author_id: str
    author_name: str
    author_role: Role
    content: str
    image: Optional[str] = None
    likes: List[str] = []
    comment_count: int = 0
    created_at: str


class CommentIn(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_name: str
    content: str
    created_at: str


class MessageIn(BaseModel):
    to_user_id: str
    content: str


class MessageOut(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    content: str
    created_at: str


class ConversationOut(BaseModel):
    user_id: str
    name: str
    role: Role
    last_message: str
    last_at: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "phone": u.get("phone", ""),
        "email": u["email"],
        "role": u.get("role", "farmer"),
        "location": u.get("location"),
        "bio": u.get("bio"),
        "avatar": u.get("avatar"),
        "created_at": u.get("created_at", now_iso()),
    }


# ----------------------------------------------------------------------------
# Startup: indexes + seed
# ----------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.listings.create_index("created_at")
    await db.posts.create_index("created_at")
    await db.comments.create_index("post_id")
    await db.messages.create_index([("from_user_id", 1), ("to_user_id", 1)])

    # seed admin farmer
    admin_email = os.environ.get("ADMIN_EMAIL", "ravi@agroconnect.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Farm@123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Ravi Kumar",
            "phone": "+91 90000 00001",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "farmer",
            "location": "Nashik, Maharashtra",
            "bio": "3rd-generation farmer growing tomatoes, onions and grapes.",
            "avatar": None,
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # seed test buyer
    buyer_email = "buyer@agroconnect.in"
    buyer_password = "Buy@1234"
    bex = await db.users.find_one({"email": buyer_email})
    if bex is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Anjali Sharma",
            "phone": "+91 90000 00002",
            "email": buyer_email,
            "password_hash": hash_password(buyer_password),
            "role": "buyer",
            "location": "Pune, Maharashtra",
            "bio": "Wholesale buyer for organic produce.",
            "avatar": None,
            "created_at": now_iso(),
        })
    elif not verify_password(buyer_password, bex["password_hash"]):
        await db.users.update_one({"email": buyer_email}, {"$set": {"password_hash": hash_password(buyer_password)}})

    # seed listings if none
    if await db.listings.count_documents({}) == 0:
        seller = await db.users.find_one({"email": admin_email})
        samples = [
            ("Organic Tomato Seeds (Hybrid F1)", "seeds", 320, "kg", 50, "Nashik", "High-yield disease-resistant variety."),
            ("Urea Fertilizer 50kg Bag", "fertilizers", 280, "bag", 200, "Nashik", "Govt-certified, nitrogen 46%."),
            ("Neem Oil Pesticide 1L", "pesticides", 450, "litre", 80, "Nashik", "100% cold-pressed neem, organic safe."),
            ("Mini Power Tiller (5HP)", "equipment", 48000, "piece", 4, "Nashik", "Diesel-powered, lightly used, 1 yr old."),
            ("Bajra (Pearl Millet) Seeds", "seeds", 95, "kg", 300, "Jodhpur", "Drought-resistant local variety."),
            ("DAP Fertilizer 50kg", "fertilizers", 1350, "bag", 60, "Indore", "Diammonium Phosphate, premium grade."),
        ]
        docs = []
        for title, cat, price, unit, qty, loc, desc in samples:
            docs.append({
                "id": str(uuid.uuid4()),
                "title": title,
                "category": cat,
                "price": price,
                "unit": unit,
                "quantity": qty,
                "location": loc,
                "description": desc,
                "image": None,
                "seller_id": seller["id"],
                "seller_name": seller["name"],
                "seller_phone": seller["phone"],
                "created_at": now_iso(),
            })
        await db.listings.insert_many(docs)

    # seed posts if none
    if await db.posts.count_documents({}) == 0:
        seller = await db.users.find_one({"email": admin_email})
        buyer = await db.users.find_one({"email": buyer_email})
        samples = [
            (seller, "Just harvested 2 tonnes of organic tomatoes this week. Looking for wholesale buyers in Maharashtra. DM me!"),
            (seller, "Has anyone tried the new neem-based pesticide from Krishi Vigyan Kendra? Need feedback before I switch."),
            (buyer, "Hello farmers! I am looking for 500kg of organic onions for export. Please reach out."),
        ]
        docs = []
        for u, content in samples:
            docs.append({
                "id": str(uuid.uuid4()),
                "author_id": u["id"],
                "author_name": u["name"],
                "author_role": u["role"],
                "content": content,
                "image": None,
                "likes": [],
                "created_at": now_iso(),
            })
        await db.posts.insert_many(docs)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "AgroConnect", "ok": True}


@api.post("/auth/register", response_model=AuthOut)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "phone": body.phone,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "location": body.location,
        "bio": None,
        "avatar": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email)
    set_auth_cookies(response, token, create_refresh_token(user["id"]))
    return {"user": public_user(user), "token": token}


@api.post("/auth/login", response_model=AuthOut)
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookies(response, token, create_refresh_token(user["id"]))
    return {"user": public_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.put("/auth/me", response_model=UserOut)
async def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return public_user(updated)


# ----------------------------------------------------------------------------
# Listings
# ----------------------------------------------------------------------------
@api.get("/listings", response_model=List[ListingOut])
async def list_listings(category: Optional[str] = None, q: Optional[str] = None):
    qry = {}
    if category and category != "all":
        qry["category"] = category
    if q:
        qry["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]
    items = await db.listings.find(qry, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api.post("/listings", response_model=ListingOut)
async def create_listing(body: ListingIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_phone": user.get("phone", ""),
        "created_at": now_iso(),
    })
    await db.listings.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.get("/listings/{listing_id}", response_model=ListingOut)
async def get_listing(listing_id: str):
    item = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    return item


@api.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, user: dict = Depends(get_current_user)):
    item = await db.listings.find_one({"id": listing_id})
    if not item:
        raise HTTPException(404, "Not found")
    if item["seller_id"] != user["id"]:
        raise HTTPException(403, "Not your listing")
    await db.listings.delete_one({"id": listing_id})
    return {"ok": True}


@api.get("/listings/user/{user_id}", response_model=List[ListingOut])
async def listings_by_user(user_id: str):
    items = await db.listings.find({"seller_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items


# ----------------------------------------------------------------------------
# Community posts
# ----------------------------------------------------------------------------
async def post_to_out(p: dict) -> dict:
    return {
        "id": p["id"],
        "author_id": p["author_id"],
        "author_name": p["author_name"],
        "author_role": p["author_role"],
        "content": p["content"],
        "image": p.get("image"),
        "likes": p.get("likes", []),
        "comment_count": await db.comments.count_documents({"post_id": p["id"]}),
        "created_at": p["created_at"],
    }


@api.get("/posts", response_model=List[PostOut])
async def list_posts():
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [await post_to_out(p) for p in posts]


@api.post("/posts", response_model=PostOut)
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user["name"],
        "author_role": user.get("role", "farmer"),
        "content": body.content,
        "image": body.image,
        "likes": [],
        "created_at": now_iso(),
    }
    await db.posts.insert_one(doc.copy())
    return await post_to_out(doc)


@api.post("/posts/{post_id}/like", response_model=PostOut)
async def toggle_like(post_id: str, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Post not found")
    likes = p.get("likes", [])
    if user["id"] in likes:
        likes.remove(user["id"])
    else:
        likes.append(user["id"])
    await db.posts.update_one({"id": post_id}, {"$set": {"likes": likes}})
    p["likes"] = likes
    return await post_to_out(p)


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    if p["author_id"] != user["id"]:
        raise HTTPException(403, "Not your post")
    await db.posts.delete_one({"id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    return {"ok": True}


@api.get("/posts/{post_id}/comments", response_model=List[CommentOut])
async def list_comments(post_id: str):
    return await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.post("/posts/{post_id}/comments", response_model=CommentOut)
async def add_comment(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    if not await db.posts.find_one({"id": post_id}):
        raise HTTPException(404, "Post not found")
    doc = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "author_id": user["id"],
        "author_name": user["name"],
        "content": body.content,
        "created_at": now_iso(),
    }
    await db.comments.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------------
# Direct messages (simple)
# ----------------------------------------------------------------------------
@api.get("/messages/conversations", response_model=List[ConversationOut])
async def conversations(user: dict = Depends(get_current_user)):
    msgs = await db.messages.find(
        {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(1000)
    seen = {}
    for m in msgs:
        other = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
        if other in seen:
            continue
        u = await db.users.find_one({"id": other}, {"_id": 0, "password_hash": 0})
        if not u:
            continue
        seen[other] = {
            "user_id": other,
            "name": u["name"],
            "role": u.get("role", "farmer"),
            "last_message": m["content"],
            "last_at": m["created_at"],
        }
    return list(seen.values())


@api.get("/messages/{other_id}", response_model=List[MessageOut])
async def thread(other_id: str, user: dict = Depends(get_current_user)):
    msgs = await db.messages.find(
        {"$or": [
            {"from_user_id": user["id"], "to_user_id": other_id},
            {"from_user_id": other_id, "to_user_id": user["id"]},
        ]},
        {"_id": 0},
    ).sort("created_at", 1).to_list(1000)
    return msgs


@api.post("/messages", response_model=MessageOut)
async def send_message(body: MessageIn, user: dict = Depends(get_current_user)):
    if not await db.users.find_one({"id": body.to_user_id}):
        raise HTTPException(404, "Recipient not found")
    doc = {
        "id": str(uuid.uuid4()),
        "from_user_id": user["id"],
        "to_user_id": body.to_user_id,
        "content": body.content,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------------
# Users
# ----------------------------------------------------------------------------
@api.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: str):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return public_user(u)


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
