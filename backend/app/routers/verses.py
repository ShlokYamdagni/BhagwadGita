import datetime
import hashlib
import random
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Verse, Chapter
from backend.app.schemas.schemas import VerseOut, ChapterOut

router = APIRouter(prefix="/verses", tags=["verses"])

# Stable templates for daily reflections when offline/mocking
DAILY_EXTRA_TEMPLATES = [
    {
        "reflection": "Today, remember that you are not defined by temporary external gains or losses. Your true worth lies in your character, your sincerity, and your peace of mind.",
        "action": "Spend five minutes sitting silently, observing your breath, and separating your identity from your tasks."
    },
    {
        "reflection": "True strength is not showing aggression; it is maintaining inner composure when tested. Conquer yourself and the world will feel harmonious.",
        "action": "When someone acts impatiently with you today, take a deep breath and respond with calmness."
    },
    {
        "reflection": "Attachment to outcomes makes us fragile. Embrace the joy of doing your work with devotion, and hand over the results to the universe.",
        "action": "Identify one outcome you are holding onto tightly and consciously tell yourself: 'I release control over this result.'"
    },
    {
        "reflection": "Action is superior to inaction. Even a small, simple step in the right direction creates momentum and dispels laziness.",
        "action": "Take action on a task you've been delaying for a long time, spending just 10 minutes on it."
    }
]

@router.get("/chapters", response_model=List[ChapterOut])
def get_chapters(db: Session = Depends(get_db)) -> Any:
    """
    Get all 18 chapters of the Bhagavad Gita with summaries.
    """
    return db.query(Chapter).order_by(Chapter.chapter_number).all()

@router.get("/daily")
def get_daily_verse(db: Session = Depends(get_db)) -> Any:
    """
    Retrieve a stable 'Verse of the Day' based on a calendar date seed.
    Includes custom daily reflections and actionable tasks.
    """
    # 1. Use the current date to get a stable verse ID (1 to 701)
    today_str = datetime.date.today().isoformat()
    seed = int(hashlib.md5(today_str.encode()).hexdigest(), 16)
    random.seed(seed)
    
    verse_id = random.randint(1, 701)
    verse = db.query(Verse).filter(Verse.id == verse_id).first()
    
    if not verse:
        # Fallback if ID doesn't exist
        verse = db.query(Verse).filter(Verse.chapter_number == 2, Verse.verse_number == 47).first()
    if not verse:
        # Emergency fallback for testing/empty DB
        verse = db.query(Verse).first()

    # Pick a stable extra template using the same seed
    tmpl = random.choice(DAILY_EXTRA_TEMPLATES)
    
    return {
        "verse_id": verse.id,
        "chapter_number": verse.chapter_number,
        "verse_number": verse.verse_number,
        "text_sanskrit": verse.text_sanskrit,
        "transliteration": verse.transliteration,
        "english_translation": verse.english_translation,
        "word_meanings": verse.word_meanings,
        "explanation": verse.explanation,
        "daily_reflection": tmpl["reflection"],
        "daily_action": tmpl["action"],
        "date": today_str
    }

@router.get("/search", response_model=List[VerseOut])
def search_verses(q: str, db: Session = Depends(get_db)) -> Any:
    """
    Perform a text-based keyword search across the Gita verses.
    """
    if len(q.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 3 characters long."
        )
    
    # Use simple text search on SQLite fallback or GIN index in Postgres
    # Performs filtering using SQL LIKE
    like_query = f"%{q}%"
    verses = db.query(Verse).filter(
        (Verse.search_text.like(like_query)) |
        (Verse.english_translation.like(like_query)) |
        (Verse.explanation.like(like_query))
    ).limit(30).all()
    
    return verses

@router.get("/{chapter}/{verse}", response_model=VerseOut)
def get_verse_detail(chapter: int, verse: int, db: Session = Depends(get_db)) -> Any:
    """
    Get detail of a specific verse (e.g. Chapter 2 Verse 47).
    """
    v = db.query(Verse).filter(Verse.chapter_number == chapter, Verse.verse_number == verse).first()
    if not v:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verse not found: Chapter {chapter} Verse {verse}"
        )
    return v
