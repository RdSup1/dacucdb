from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import bcrypt
import jwt
import asyncpg
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr, ConfigDict

try:
    from supabase import create_client as _supa_create_client
except ImportError:
    _supa_create_client = None


# -----------------------
# Config & DB Pool (Supabase PostgreSQL via Transaction Pooler)
# -----------------------
DATABASE_URL = os.environ['DATABASE_URL']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Fomerstick API (Supabase)")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        # statement_cache_size=0 é necessário com Transaction Pooler (pgBouncer)
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=1,
            max_size=10,
            statement_cache_size=0,
            command_timeout=30,
        )
    return pool


def _supa_admin():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key or _supa_create_client is None:
        return None
    return _supa_create_client(url, key)


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


def row_to_dict(row) -> dict:
    """Converte asyncpg.Record para dict com datetimes em ISO."""
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            d[k] = str(v)
    return d


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
        p = await get_pool()
        async with p.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, name, role, created_at FROM users WHERE id = $1",
                uuid.UUID(payload["sub"]),
            )
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        return row_to_dict(row)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# -----------------------
# Pydantic Models
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
    status: str
    queue_position: Optional[int] = None
    requested_at: str
    activated_at: Optional[str] = None
    returned_at: Optional[str] = None
    due_date: Optional[str] = None
    requested_days: int
    notes: str = ""


# -----------------------
# Schema (DDL) — executed on startup
# -----------------------
SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    description     TEXT NOT NULL,
    image_url       TEXT NOT NULL,
    specs           TEXT NOT NULL DEFAULT '',
    total_units     INT  NOT NULL DEFAULT 1,
    available_units INT  NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    equipment_id    UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    user_name       TEXT NOT NULL,
    user_email      TEXT NOT NULL,
    equipment_name  TEXT NOT NULL,
    equipment_image TEXT NOT NULL,
    status          TEXT NOT NULL,
    queue_position  INT,
    requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at    TIMESTAMPTZ,
    returned_at     TIMESTAMPTZ,
    due_date        TIMESTAMPTZ,
    requested_days  INT NOT NULL DEFAULT 7,
    notes           TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_loans_eq_status ON loans(equipment_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_user      ON loans(user_id);
"""


# -----------------------
# Auth endpoints
# -----------------------
@api_router.post("/auth/register", response_model=AuthOut)
async def register(payload: RegisterIn):
    email = payload.email.lower().strip()
    p = await get_pool()
    async with p.acquire() as conn:
        existing = await conn.fetchval("SELECT id FROM users WHERE email = $1", email)
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        row = await conn.fetchrow(
            """INSERT INTO users (email, name, password_hash, role)
               VALUES ($1, $2, $3, 'user')
               RETURNING id, email, name, role, created_at""",
            email, payload.name.strip(), hash_password(payload.password),
        )
    user = row_to_dict(row)
    token = create_access_token(user["id"], user["email"], user["role"])
    return AuthOut(user=UserOut(**user), access_token=token)


@api_router.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, name, role, password_hash, created_at FROM users WHERE email = $1",
            email,
        )
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    user = row_to_dict(row)
    user.pop("password_hash", None)
    token = create_access_token(user["id"], user["email"], user["role"])
    return AuthOut(user=UserOut(**user), access_token=token)


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


# -----------------------
# Equipment endpoints
# -----------------------
@api_router.get("/equipment", response_model=List[EquipmentOut])
async def list_equipment():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM equipment ORDER BY created_at DESC"
        )
    return [EquipmentOut(**row_to_dict(r)) for r in rows]


@api_router.get("/equipment/{equipment_id}", response_model=EquipmentOut)
async def get_equipment(equipment_id: str):
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM equipment WHERE id = $1", uuid.UUID(equipment_id))
    if not row:
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    return EquipmentOut(**row_to_dict(row))


@api_router.post("/equipment", response_model=EquipmentOut)
async def create_equipment(payload: EquipmentIn, admin: dict = Depends(require_admin)):
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO equipment (name, category, description, image_url, specs, total_units, available_units)
               VALUES ($1, $2, $3, $4, $5, $6, $6)
               RETURNING *""",
            payload.name, payload.category, payload.description,
            payload.image_url, payload.specs or "", payload.total_units,
        )
    return EquipmentOut(**row_to_dict(row))


@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, admin: dict = Depends(require_admin)):
    p = await get_pool()
    async with p.acquire() as conn:
        res = await conn.execute("DELETE FROM equipment WHERE id = $1", uuid.UUID(equipment_id))
    if res.endswith(" 0"):
        raise HTTPException(status_code=404, detail="Equipamento não encontrado")
    return {"deleted": True}


# -----------------------
# Loans / Smart Queue
# -----------------------
async def _recalc_queue_positions(conn, equipment_id: uuid.UUID):
    """Reposiciona números da fila (1, 2, 3...) ordenando por requested_at."""
    await conn.execute("""
        WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY requested_at ASC) AS pos
            FROM loans
            WHERE equipment_id = $1 AND status = 'queued'
        )
        UPDATE loans SET queue_position = ordered.pos
        FROM ordered WHERE loans.id = ordered.id
    """, equipment_id)


async def _user_fairness_score(conn, user_id: uuid.UUID) -> int:
    """Quantos empréstimos o usuário usou nos últimos 30 dias. Menor = mais prioridade."""
    return await conn.fetchval("""
        SELECT COUNT(*) FROM loans
        WHERE user_id = $1
          AND status IN ('active', 'returned')
          AND requested_at >= NOW() - INTERVAL '30 days'
    """, user_id)


async def _try_activate_next(conn, equipment_id: uuid.UUID):
    """Algoritmo de Equidade: ativa o próximo da fila com menor fairness score."""
    eq = await conn.fetchrow(
        "SELECT available_units FROM equipment WHERE id = $1", equipment_id,
    )
    if not eq or eq["available_units"] <= 0:
        return
    queued = await conn.fetch(
        "SELECT id, user_id, requested_days, requested_at FROM loans "
        "WHERE equipment_id = $1 AND status = 'queued'",
        equipment_id,
    )
    if not queued:
        return
    scored = []
    for loan in queued:
        s = await _user_fairness_score(conn, loan["user_id"])
        scored.append((s, loan["requested_at"], loan))
    scored.sort(key=lambda x: (x[0], x[1]))
    next_loan = scored[0][2]
    await conn.execute("""
        UPDATE loans SET
            status = 'active',
            activated_at = NOW(),
            due_date = NOW() + ($1 * INTERVAL '1 day'),
            queue_position = NULL
        WHERE id = $2
    """, next_loan["requested_days"], next_loan["id"])
    await conn.execute(
        "UPDATE equipment SET available_units = available_units - 1 WHERE id = $1",
        equipment_id,
    )
    await _recalc_queue_positions(conn, equipment_id)


@api_router.post("/loans/request", response_model=LoanOut)
async def request_loan(payload: LoanRequestIn, user: dict = Depends(get_current_user)):
    eq_id = uuid.UUID(payload.equipment_id)
    user_id = uuid.UUID(user["id"])
    p = await get_pool()
    async with p.acquire() as conn:
        async with conn.transaction():
            eq = await conn.fetchrow(
                "SELECT id, name, image_url FROM equipment WHERE id = $1", eq_id,
            )
            if not eq:
                raise HTTPException(status_code=404, detail="Equipamento não encontrado")
            dup = await conn.fetchval(
                "SELECT id FROM loans WHERE user_id = $1 AND equipment_id = $2 "
                "AND status IN ('queued', 'active')",
                user_id, eq_id,
            )
            if dup:
                raise HTTPException(status_code=400, detail="Você já possui solicitação ativa para este equipamento")
            row = await conn.fetchrow("""
                INSERT INTO loans (
                    user_id, equipment_id, user_name, user_email,
                    equipment_name, equipment_image, status, requested_days, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7, $8)
                RETURNING id
            """, user_id, eq_id, user["name"], user["email"],
                 eq["name"], eq["image_url"], payload.requested_days, payload.notes or "")
            await _recalc_queue_positions(conn, eq_id)
            await _try_activate_next(conn, eq_id)
            final = await conn.fetchrow("SELECT * FROM loans WHERE id = $1", row["id"])
    return LoanOut(**row_to_dict(final))


@api_router.get("/loans/mine", response_model=List[LoanOut])
async def my_loans(user: dict = Depends(get_current_user)):
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM loans WHERE user_id = $1 ORDER BY requested_at DESC",
            uuid.UUID(user["id"]),
        )
    return [LoanOut(**row_to_dict(r)) for r in rows]


@api_router.post("/loans/{loan_id}/return", response_model=LoanOut)
async def return_loan(loan_id: str, user: dict = Depends(get_current_user)):
    p = await get_pool()
    async with p.acquire() as conn:
        async with conn.transaction():
            loan = await conn.fetchrow("SELECT * FROM loans WHERE id = $1", uuid.UUID(loan_id))
            if not loan:
                raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
            if str(loan["user_id"]) != user["id"] and user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Sem permissão")
            if loan["status"] != "active":
                raise HTTPException(status_code=400, detail="Empréstimo não está ativo")
            await conn.execute(
                "UPDATE loans SET status = 'returned', returned_at = NOW() WHERE id = $1",
                uuid.UUID(loan_id),
            )
            await conn.execute(
                "UPDATE equipment SET available_units = available_units + 1 WHERE id = $1",
                loan["equipment_id"],
            )
            await _try_activate_next(conn, loan["equipment_id"])
            final = await conn.fetchrow("SELECT * FROM loans WHERE id = $1", uuid.UUID(loan_id))
    return LoanOut(**row_to_dict(final))


@api_router.post("/loans/{loan_id}/cancel", response_model=LoanOut)
async def cancel_loan(loan_id: str, user: dict = Depends(get_current_user)):
    p = await get_pool()
    async with p.acquire() as conn:
        async with conn.transaction():
            loan = await conn.fetchrow("SELECT * FROM loans WHERE id = $1", uuid.UUID(loan_id))
            if not loan:
                raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
            if str(loan["user_id"]) != user["id"] and user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Sem permissão")
            if loan["status"] != "queued":
                raise HTTPException(status_code=400, detail="Só é possível cancelar solicitações na fila")
            await conn.execute(
                "UPDATE loans SET status = 'cancelled' WHERE id = $1", uuid.UUID(loan_id),
            )
            await _recalc_queue_positions(conn, loan["equipment_id"])
            final = await conn.fetchrow("SELECT * FROM loans WHERE id = $1", uuid.UUID(loan_id))
    return LoanOut(**row_to_dict(final))


@api_router.get("/loans/all", response_model=List[LoanOut])
async def all_loans(admin: dict = Depends(require_admin)):
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM loans ORDER BY requested_at DESC")
    return [LoanOut(**row_to_dict(r)) for r in rows]


# -----------------------
# Stats
# -----------------------
@api_router.get("/stats")
async def stats():
    p = await get_pool()
    async with p.acquire() as conn:
        total_eq = await conn.fetchval("SELECT COUNT(*) FROM equipment")
        active = await conn.fetchval("SELECT COUNT(*) FROM loans WHERE status = 'active'")
        queued = await conn.fetchval("SELECT COUNT(*) FROM loans WHERE status = 'queued'")
        users = await conn.fetchval("SELECT COUNT(*) FROM users")
    return {
        "total_equipment": total_eq,
        "active_loans": active,
        "queued_requests": queued,
        "total_users": users,
    }


# -----------------------
# Supabase Storage upload
# -----------------------
@api_router.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = "equipment",
    user: dict = Depends(get_current_user),
):
    sup = _supa_admin()
    if sup is None:
        raise HTTPException(status_code=503, detail="Supabase nao configurado")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Apenas imagens sao permitidas")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagem maior que 5MB")
    bucket = os.environ.get("SUPABASE_BUCKET", "imagens")
    ext = (file.filename or "img").split(".")[-1].lower() if "." in (file.filename or "") else "jpg"
    safe_folder = folder.replace("/", "_") or "misc"
    path = f"{safe_folder}/{uuid.uuid4()}.{ext}"
    try:
        sup.storage.from_(bucket).upload(
            path=path,
            file=data,
            file_options={"content-type": file.content_type, "upsert": "false"},
        )
        public_url = sup.storage.from_(bucket).get_public_url(path)
    except Exception as e:
        logger.error(f"Supabase upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Falha no upload: {e}")
    return {"public_url": public_url, "path": path, "bucket": bucket}


@api_router.get("/")
async def root():
    return {"service": "Fomerstick API", "db": "Supabase PostgreSQL", "status": "ok"}


# -----------------------
# Seed
# -----------------------
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


async def seed_admin(conn):
    email = os.environ.get("ADMIN_EMAIL", "admin@fomerstick.com")
    pwd = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await conn.fetchrow(
        "SELECT id, password_hash FROM users WHERE email = $1", email
    )
    if not existing:
        await conn.execute(
            "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin')",
            email, "Admin Fomerstick", hash_password(pwd),
        )
        logger.info(f"Seeded admin: {email}")
    elif not verify_password(pwd, existing["password_hash"]):
        await conn.execute(
            "UPDATE users SET password_hash = $1, role = 'admin' WHERE email = $2",
            hash_password(pwd), email,
        )


async def seed_equipment(conn):
    count = await conn.fetchval("SELECT COUNT(*) FROM equipment")
    if count > 0:
        return
    for item in SEED_EQUIPMENT:
        await conn.execute("""
            INSERT INTO equipment (name, category, description, image_url, specs, total_units, available_units)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
        """, item["name"], item["category"], item["description"],
             item["image_url"], item["specs"], item["total_units"])
    logger.info(f"Seeded {len(SEED_EQUIPMENT)} equipment items")


def ensure_supabase_bucket():
    sup = _supa_admin()
    bucket = os.environ.get("SUPABASE_BUCKET", "imagens")
    if sup is None:
        logger.info("Supabase nao configurado - pulando criacao de bucket")
        return
    try:
        buckets = sup.storage.list_buckets()
        names = []
        for b in buckets:
            n = getattr(b, "name", None) or (b.get("name") if isinstance(b, dict) else None)
            if n:
                names.append(n)
        if bucket in names:
            logger.info(f"Supabase bucket '{bucket}' ja existe")
            return
        sup.storage.create_bucket(
            bucket, options={"public": True, "file_size_limit": 5 * 1024 * 1024},
        )
        logger.info(f"Supabase bucket '{bucket}' criado (publico)")
    except Exception as e:
        logger.warning(f"Supabase bucket setup falhou: {e}")


@app.on_event("startup")
async def on_startup():
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute(SCHEMA_SQL)
        await seed_admin(conn)
        await seed_equipment(conn)
    ensure_supabase_bucket()
    logger.info("Fomerstick API ready (Supabase PostgreSQL)")


@app.on_event("shutdown")
async def on_shutdown():
    global pool
    if pool is not None:
        await pool.close()
        pool = None


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
