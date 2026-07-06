import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Spiritual Guidance AI API"
    API_V1_STR: str = "/api"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "8f45a0b12f6cdbc229ab1de278918cb4691456d8f89b5314e1a0650961b72e9a")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "backend/gita.db")
    
    # AI APIs
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
