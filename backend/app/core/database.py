import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("app.database")

# Read configurations
DATABASE_URL = os.getenv("DATABASE_URL", "")
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "backend/gita.db")

# Automatically construct absolute SQLite path
if not DATABASE_URL:
    # Resolve relative database path
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    db_file = os.path.join(base_dir, "gita.db")
    DATABASE_URL = f"sqlite:///{db_file}"
    logger.info(f"Using fallback SQLite database at: {db_file}")

# Configure DB Engine
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test connection
    with engine.connect() as conn:
        logger.info("Successfully connected to database.")
except Exception as e:
    logger.error(f"Failed to connect to database URL '{DATABASE_URL}': {e}")
    # Fallback to local SQLite
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    db_file = os.path.join(base_dir, "gita.db")
    DATABASE_URL = f"sqlite:///{db_file}"
    logger.warning(f"Database connection failed. Falling back to local SQLite at: {db_file}")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
