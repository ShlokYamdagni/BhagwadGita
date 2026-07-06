import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.models.models import Verse, Chapter

# Setup SQLite in-memory database for testing
DATABASE_URL = "sqlite://"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Create the database tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed mockup data for RAG and search checks
    mock_chapter = Chapter(
        id=1,
        chapter_number=1,
        name="Arjuna Vishada Yoga",
        name_transliteration="Arjuna Vishada Yoga",
        name_translation="Arjuna's Dilemma",
        verses_count=1,
        summary="Arjuna faces distress on Kurukshetra."
    )
    db.add(mock_chapter)
    
    mock_verse = Verse(
        id=1,
        chapter_number=1,
        verse_number=1,
        text_sanskrit="धर्मक्षेत्रे कुरुक्षेत्रे...",
        transliteration="dharma-kṣhetre kuru-kṣhetre...",
        english_translation="Gathered on the holy plain of Kurukshetra...",
        word_meanings="dharma-kṣhetre--holy land",
        explanation="Swami Sivananda explanation: This represents Arjuna's internal conflict.",
        search_text="Chapter 1 Verse 1. holy plain of Kurukshetra",
        embedding=None
    )
    db.add(mock_verse)
    db.commit()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    # Override get_db dependency to yield the testing session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
