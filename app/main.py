from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from app.database import engine, Base
from app.routers.auth_router import router as auth_router
from app.routers.store_router import router as store_router
from app.routers.inventory_router import router as inventory_router
from app.routers.transaction_router import router as transaction_router
from app.routers.notifications_router import router as notifications_router

Base.metadata.create_all(bind=engine)


def run_migrations():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN title VARCHAR"))
            conn.commit()
        except Exception:
            pass  # column already exists


run_migrations()

app = FastAPI(title="Bookstop API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(store_router)
app.include_router(inventory_router)
app.include_router(transaction_router)
app.include_router(notifications_router)


@app.get("/api/health")
def health():
    from app.database import SessionLocal

    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1 FROM users LIMIT 0"))
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    return {"status": "ok", "db": db_status}
