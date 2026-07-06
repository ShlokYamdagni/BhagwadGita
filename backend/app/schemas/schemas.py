from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None

# --- User Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    voice_enabled: Optional[bool] = None

# --- Gita Verses Schemas ---
class VerseOut(BaseModel):
    id: int
    chapter_number: int
    verse_number: int
    text_sanskrit: str
    transliteration: str
    english_translation: str
    word_meanings: str
    explanation: str

    class Config:
        from_attributes = True

class ChapterOut(BaseModel):
    id: int
    chapter_number: int
    name: str
    name_transliteration: str
    name_translation: str
    verses_count: int
    summary: str

    class Config:
        from_attributes = True

# --- Chat Schemas ---
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    emotion_detected: Optional[str] = None
    verse_id: Optional[int] = None
    created_at: datetime
    verse: Optional[VerseOut] = None

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: str

class ChatSessionOut(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Bookmark Schemas ---
class BookmarkCreate(BaseModel):
    verse_id: int
    chat_message_id: Optional[int] = None

class BookmarkOut(BaseModel):
    id: int
    user_id: int
    verse_id: int
    chat_message_id: Optional[int] = None
    created_at: datetime
    verse: VerseOut

    class Config:
        from_attributes = True
