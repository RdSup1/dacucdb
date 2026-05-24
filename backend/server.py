from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# -----------------------
# Config & DB
# -----------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Fomerstick API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# -----------------------
# Helpers
# -----------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    token = None
    if creds and creds.credentials:
        token = creds.credentials
    else:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# -----------------------
# Models
# -----------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class AuthOut(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"


class EquipmentIn(BaseModel):
    name: str
    category: str
    description: str
    image_url: str
    total_units: int = Field(ge=1, default=1)
    specs: Optional[str] = ""


class EquipmentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category: str
    description: str
    image_url: str
    total_units: int
    available_units: int
    specs: str = ""
    created_at: str


class LoanRequestIn(BaseModel):
    equipment_id: str
    notes: Optional[str] = ""
    requested_days: int = Field(ge=1, le=30, default=7)


class LoanOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    user_email: str
    equipment_id: str
    equipment_name: str
    equipment_image: str
    status: str  # queued | active | returned | cancelled
    queue_position: Optional[int] = None
    requested_at: str
    activated_at: Optional[str] = None
    returned_at: Optional[str] = None
    due_date: Optional[str] = None
    requested_days: int
    notes: str = ""


# -----------------------
# Auth Endpoints
# -----------------------
@api_router.post("/auth/register", response_model=AuthOut)
async def register(payload: RegisterIn):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "user",
        "created_at": utc_iso(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email, "user")
    return AuthOut(
        user=UserOut(id=user_id, email=email, name=doc["name"], role="user", created_at=doc["created_at"]),
        access_token=token,
    )


@api_router.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["id"], user["email"], user["role"])
    return AuthOut(
        user=UserOut(
            id=user["id"], email=user["email"], name=user["name"],
            role=user["role"], created_at=user["created_at"],
        ),
        access_token=token,
    )


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


# -----------------------
# Equipment Endpoints
# -----------------------
@api_router.get("/equipment", response_model=List[EquipmentOut])
async def list_equipment():
    items = await db.equipment.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [EquipmentOut(**item) for item in items]


@api_router.get("/equipment/{equipment_id}", response_model=EquipmentOut)
async def get_equipment(equipment_id: str):
    item = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    return EquipmentOut(**item)


@api_router.post("/equipment", response_model=EquipmentOut)
async def create_equipment(payload: EquipmentIn, admin: dict = Depends(require_admin)):
    eq_id = str(uuid.uuid4())
    doc = {
        "id": eq_id,
        "name": payload.name,
        "category": payload.category,
        "description": payload.description,
        "image_url": payload.image_url,
        "specs": payload.specs or "",
        "total_units": payload.total_units,
        "available_units": payload.total_units,
        "created_at": utc_iso(),
    }
    await db.equipment.insert_one(doc)
    return EquipmentOut(**doc)


@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, admin: dict = Depends(require_admin)):
    res = await db.equipment.delete_one({"id": equipment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    await db.loans.delete_many({"equipment_id": equipment_id, "status": {"$in": ["queued"]}})
    return {"deleted": True}


# -----------------------
# Loans / Smart Queue
# -----------------------
async def _recalc_queue_positions(equipment_id: str):
    queued = await db.loans.find(
        {"equipment_id": equipment_id, "status": "queued"}
    ).sort("requested_at", 1).to_list(1000)
    for idx, loan in enumerate(queued):
        await db.loans.update_one({"id": loan["id"]}, {"$set": {"queue_position": idx + 1}})


async def _user_fairness_score(user_id: str) -> int:
    """Lower is fairer. Counts user's active + returned loans in last 30 days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    count = await db.loans.count_documents({
        "user_id": user_id,
        "status": {"$in": ["active", "returned"]},
        "requested_at": {"$gte": cutoff},
    })
    return count


async def _try_activate_next(equipment_id: str):
    eq = await db.equipment.find_one({"id": equipment_id})
    if not eq or eq["available_units"] <= 0:
        return
    queued = await db.loans.find(
        {"equipment_id": equipment_id, "status": "queued"}
    ).to_list(1000)
    if not queued:
        return
    # Smart Queue: equidade — usuário com menor score tem prioridade, empate por requested_at
    scored = []
    for loan in queued:
        s = await _user_fairness_score(loan["user_id"])
        scored.append((s, loan["requested_at"], loan))
    scored.sort(key=lambda x: (x[0], x[1]))
    next_loan = scored[0][2]
    activated_at = utc_iso()
    due = (datetime.now(timezone.utc) + timedelta(days=next_loan["requested_days"])).isoformat()
    await db.loans.update_one(
        {"id": next_loan["id"]},
        {"$set": {
            "status": "active",
            "activated_at": activated_at,
            "due_date": due,
            "queue_position": None,
        }},
    )
    await db.equipment.update_one(
        {"id": equipment_id},
        {"$inc": {"available_units": -1}},
    )
    await _recalc_queue_positions(equipment_id)


@api_router.post("/loans/request", response_model=LoanOut)
async def request_loan(payload: LoanRequestIn, user: dict = Depends(get_current_user)):
    eq = await db.equipment.find_one({"id": payload.equipment_id}, {"_id": 0})
    if not eq:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    # Don't allow double active/queued for same equipment
    existing = await db.loans.find_one({
        "user_id": user["id"],
        "equipment_id": payload.equipment_id,
        "status": {"$in": ["queued", "active"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Você já possui solicitação ativa para este equipamento")

    loan_id = str(uuid.uuid4())
    doc = {
        "id": loan_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "equipment_id": eq["id"],
        "equipment_name": eq["name"],
        "equipment_image": eq["image_url"],
        "status": "queued",
        "queue_position": None,
        "requested_at": utc_iso(),
        "activated_at": None,
        "returned_at": None,
        "due_date": None,
        "requested_days": payload.requested_days,
        "notes": payload.notes or "",
    }
    await db.loans.insert_one(doc)
    await _recalc_queue_positions(eq["id"])
    await _try_activate_next(eq["id"])

    final_doc = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    return LoanOut(**final_doc)


@api_router.get("/loans/mine", response_model=List[LoanOut])
async def my_loans(user: dict = Depends(get_current_user)):
    items = await db.loans.find({"user_id": user["id"]}, {"_id": 0}).sort("requested_at", -1).to_list(500)
    return [LoanOut(**i) for i in items]


@api_router.post("/loans/{loan_id}/return", response_model=LoanOut)
async def return_loan(loan_id: str, user: dict = Depends(get_current_user)):
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    if loan["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Sem permissão")
    if loan["status"] != "active":
        raise HTTPException(status_code=400, detail="Empréstimo não está ativo")
    await db.loans.update_one(
        {"id": loan_id},
        {"$set": {"status": "returned", "returned_at": utc_iso()}},
    )
    await db.equipment.update_one(
        {"id": loan["equipment_id"]},
        {"$inc": {"available_units": 1}},
    )
    await _try_activate_next(loan["equipment_id"])
    final = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    return LoanOut(**final)


@api_router.post("/loans/{loan_id}/cancel", response_model=LoanOut)
async def cancel_loan(loan_id: str, user: dict = Depends(get_current_user)):
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    if loan["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Sem permissão")
    if loan["status"] != "queued":
        raise HTTPException(status_code=400, detail="Só é possível cancelar solicitações na fila")
    await db.loans.update_one(
        {"id": loan_id},
        {"$set": {"status": "cancelled"}},
    )
    await _recalc_queue_positions(loan["equipment_id"])
    final = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    return LoanOut(**final)


@api_router.get("/loans/all", response_model=List[LoanOut])
async def all_loans(admin: dict = Depends(require_admin)):
    items = await db.loans.find({}, {"_id": 0}).sort("requested_at", -1).to_list(1000)
    return [LoanOut(**i) for i in items]


# -----------------------
# Stats (for landing/hero animations)
# -----------------------
@api_router.get("/stats")
async def stats():
    total_eq = await db.equipment.count_documents({})
    active_loans = await db.loans.count_documents({"status": "active"})
    queued = await db.loans.count_documents({"status": "queued"})
    users = await db.users.count_documents({})
    return {
        "total_equipment": total_eq,
        "active_loans": active_loans,
        "queued_requests": queued,
        "total_users": users,
    }


@api_router.get("/")
async def root():
    return {"service": "Fomerstick API", "status": "ok"}


# -----------------------
# Seed
# -----------------------
async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@fomerstick.com")
    pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": "Admin Fomerstick",
            "password_hash": hash_password(pwd),
            "role": "admin",
            "created_at": utc_iso(),
        })
        logger.info(f"Seeded admin: {email}")
    elif not verify_password(pwd, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(pwd), "role": "admin"}},
        )


SEED_EQUIPMENT = [
    {
        "name": "MacBook Pro 16\" M3 Max",
        "category": "Notebook",
        "description": "Notebook profissional para desenvolvimento, design e workloads pesados. Chip M3 Max, 64GB RAM, 2TB SSD.",
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=85&auto=format&fit=crop",
        "specs": "M3 Max · 64GB · 2TB SSD · 16\"",
        "total_units": 4,
    },
    {
        "name": "Dell XPS 15 OLED",
        "category": "Notebook",
        "description": "Workstation portátil com tela OLED 4K, ideal para edição de vídeo e desenvolvimento.",
        "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=85&auto=format&fit=crop",
        "specs": "i9 · 32GB · 1TB · RTX 4070",
        "total_units": 3,
    },
    {
        "name": "Samsung SSD 990 Pro 4TB",
        "category": "Armazenamento",
        "description": "SSD NVMe de altíssima performance para projetos de dataset, ML e backup rápido.",
        "image_url": "https://images.unsplash.com/photo-1601737487795-dab272f52420?w=900&q=85&auto=format&fit=crop",
        "specs": "PCIe 4.0 · 7450 MB/s · 4TB",
        "total_units": 6,
    },
    {
        "name": "Osciloscópio Digital Tektronix",
        "category": "Laboratório",
        "description": "Osciloscópio de bancada com 4 canais, 500MHz, para análise eletrônica de precisão.",
        "image_url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=85&auto=format&fit=crop",
        "specs": "4 canais · 500MHz · 5 GS/s",
        "total_units": 2,
    },
    {
        "name": "Sony A7 IV Mirrorless",
        "category": "Audiovisual",
        "description": "Câmera full-frame profissional para criação de conteúdo, documentação e estúdio.",
        "image_url": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&q=85&auto=format&fit=crop",
        "specs": "33MP · 4K 60p · Full-Frame",
        "total_units": 3,
    },
    {
        "name": "NVIDIA RTX A6000",
        "category": "GPU",
        "description": "GPU profissional para treinamento de IA, render 3D e simulações pesadas.",
        "image_url": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&q=85&auto=format&fit=crop",
        "specs": "48GB GDDR6 · 10752 CUDA · Ampere",
        "total_units": 2,
    },
]


async def seed_equipment():
    count = await db.equipment.count_documents({})
    if count > 0:
        return
    for item in SEED_EQUIPMENT:
        doc = {
            "id": str(uuid.uuid4()),
            "available_units": item["total_units"],
            "created_at": utc_iso(),
            **item,
        }
        await db.equipment.insert_one(doc)
    logger.info(f"Seeded {len(SEED_EQUIPMENT)} equipment items")


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.equipment.create_index("id", unique=True)
        await db.loans.create_index("id", unique=True)
        await db.loans.create_index([("equipment_id", 1), ("status", 1)])
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")
    await seed_admin()
    await seed_equipment()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
