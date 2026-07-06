from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any
import uuid

from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models.models import User, ChatSession, ChatMessage, Bookmark, Verse
from backend.app.schemas.schemas import (
    ChatSessionOut, ChatSessionCreate, ChatMessageOut, ChatMessageCreate, BookmarkOut, BookmarkCreate
)
from backend.app.services.ai import generate_spiritual_guidance

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(session_in: ChatSessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    """
    Start a new spiritual counseling chat session.
    """
    new_session = ChatSession(
        user_id=current_user.id,
        title=session_in.title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/sessions", response_model=List[ChatSessionOut])
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    """
    List all chat sessions for the authenticated user.
    """
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.created_at.desc()).all()
    return sessions

@router.get("/sessions/{session_id}", response_model=List[ChatMessageOut])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve message history for a specific chat session.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session.messages

@router.post("/sessions/{session_id}/message", response_model=ChatMessageOut)
def send_message(
    session_id: str,
    message_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Post a personal problem, trigger the RAG counselor workflow, and return the response.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # 1. Save user message to database
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=message_in.content
    )
    db.add(user_msg)
    db.commit()
    
    # 2. Trigger the counseling engine
    try:
        guidance = generate_spiritual_guidance(message_in.content, db)
    except Exception as e:
        db.delete(user_msg)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Guidance synthesis failed: {e}"
        )
    
    # 3. Construct clean structured markdown matching user specifications
    sanskrit_card = guidance["verse_info"]
    formatted_content = f"""{guidance['understanding']}

{guidance['guidance']}

### Bhagavad Gita Chapter {sanskrit_card['chapter']} Verse {sanskrit_card['verse']}

**Sanskrit:**
> {sanskrit_card['sanskrit'].replace(chr(10), '  ' + chr(10))}

**Transliteration:**
* {sanskrit_card['transliteration'].replace(chr(10), '  ' + chr(10))}

**English Translation:**
"{sanskrit_card['translation']}"

**Explanation:**
{guidance['meaning']}

**Today's Action:**
👉 {guidance['action']}

---
* {guidance['reflection']} *"""

    # 4. Save AI Response
    ai_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=formatted_content,
        emotion_detected=guidance["emotion"],
        verse_id=guidance["verse_id"]
    )
    db.add(ai_msg)
    
    # If the session's title was default or generic, update it with the emotional context
    if session.title in ["New Chat", "Untitled Session", "New Session"]:
        session.title = f"On {guidance['emotion']}: {message_in.content[:30]}..."
        db.add(session)
        
    db.commit()
    db.refresh(ai_msg)
    return ai_msg

# --- Bookmarks / Favorites Management ---

@router.post("/bookmarks", response_model=BookmarkOut, status_code=status.HTTP_201_CREATED)
def add_bookmark(
    bookmark_in: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Bookmark a verse or counselor response card.
    """
    # Check if already bookmarked
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.verse_id == bookmark_in.verse_id
    ).first()
    
    if existing:
        return existing
        
    # Verify verse exists
    verse = db.query(Verse).filter(Verse.id == bookmark_in.verse_id).first()
    if not verse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verse not found"
        )
        
    new_bookmark = Bookmark(
        user_id=current_user.id,
        verse_id=bookmark_in.verse_id,
        chat_message_id=bookmark_in.chat_message_id
    )
    db.add(new_bookmark)
    db.commit()
    db.refresh(new_bookmark)
    return new_bookmark

@router.get("/bookmarks", response_model=List[BookmarkOut])
def get_bookmarks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    """
    List all saved bookmarks for the authenticated user.
    """
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()).all()
    return bookmarks

@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Remove a saved bookmark by ID.
    """
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id).first()
    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found"
        )
    db.delete(bookmark)
    db.commit()
    return None
