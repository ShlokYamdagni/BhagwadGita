import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.routers import auth, chat, verses

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app.main")

# Auto-create tables on startup (for SQLite fallback simplicity)
logger.info("Initializing database schemas...")
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas initialized successfully.")
except Exception as e:
    logger.error(f"Error during schema initialization: {e}")

# Initialize application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A spiritual guidance counselor backed by the Bhagavad Gita and RAG vector searches.",
    version="1.0.0"
)

# Enable CORS for Next.js development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(verses.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["status"])
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "database": engine.name,
        "docs_url": "/docs"
    }
