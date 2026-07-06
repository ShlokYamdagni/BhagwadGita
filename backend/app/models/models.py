import uuid
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, LargeBinary, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(512))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settings = Column(JSON, default=lambda: {"theme": "system", "language": "english", "voice_enabled": False})

    # Relationships
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="user", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    chapter_number = Column(Integer, unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    name_transliteration = Column(String(255), nullable=False)
    name_translation = Column(String(255), nullable=False)
    verses_count = Column(Integer, nullable=False)
    summary = Column(Text, nullable=False)


class Verse(Base):
    __tablename__ = "verses"

    id = Column(Integer, primary_key=True, index=True)
    chapter_number = Column(Integer, nullable=False)
    verse_number = Column(Integer, nullable=False)
    text_sanskrit = Column(Text, nullable=False)
    transliteration = Column(Text, nullable=False)
    english_translation = Column(Text, nullable=False)
    word_meanings = Column(Text, nullable=False)
    explanation = Column(Text, nullable=False)
    search_text = Column(Text, nullable=False)
    embedding = Column(LargeBinary) # Stored as binary representation of float32 array

    # Relationships
    bookmarks = relationship("Bookmark", back_populates="verse", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="verse")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    emotion_detected = Column(String(50))
    verse_id = Column(Integer, ForeignKey("verses.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    verse = relationship("Verse", back_populates="messages")
    bookmarks = relationship("Bookmark", back_populates="chat_message")


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    verse_id = Column(Integer, ForeignKey("verses.id", ondelete="CASCADE"), nullable=False)
    chat_message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="bookmarks")
    verse = relationship("Verse", back_populates="bookmarks")
    chat_message = relationship("ChatMessage", back_populates="bookmarks")
