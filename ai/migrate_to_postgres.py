import os
import sys
import sqlite3
from sqlalchemy import create_engine
# Add workspace root to python path to resolve backend imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.database import Base
from backend.app.models.models import Chapter, Verse, User, ChatSession, ChatMessage, Bookmark

# Connect to target Postgres
POSTGRES_URL = os.getenv("DATABASE_URL")
if not POSTGRES_URL:
    print("ERROR: DATABASE_URL environment variable is not set!")
    sys.exit(1)

print(f"Connecting to target Postgres...")
postgres_engine = create_engine(POSTGRES_URL)

# Create all schemas in target PostgreSQL database
print("Creating tables in PostgreSQL...")
Base.metadata.create_all(bind=postgres_engine)
print("Tables created successfully.")

# Connect to source SQLite database
sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "gita.db"))
print(f"Connecting to source SQLite: {sqlite_path}")
if not os.path.exists(sqlite_path):
    print(f"ERROR: Source SQLite database not found at {sqlite_path}!")
    sys.exit(1)

sqlite_conn = sqlite3.connect(sqlite_path)
sqlite_cursor = sqlite_conn.cursor()

# Migrate chapters
print("Migrating chapters table...")
sqlite_cursor.execute("SELECT id, chapter_number, name, name_transliteration, name_translation, verses_count, summary FROM chapters")
chapters_rows = sqlite_cursor.fetchall()

with postgres_engine.begin() as pg_conn:
    # Clear existing chapters in postgres first
    pg_conn.execute(Chapter.__table__.delete())
    for row in chapters_rows:
        pg_conn.execute(
            Chapter.__table__.insert().values(
                id=row[0],
                chapter_number=row[1],
                name=row[2],
                name_transliteration=row[3],
                name_translation=row[4],
                verses_count=row[5],
                summary=row[6]
            )
        )
    print(f"Migrated {len(chapters_rows)} chapters.")

# Migrate verses
print("Migrating verses table...")
sqlite_cursor.execute("SELECT id, chapter_number, verse_number, text_sanskrit, transliteration, english_translation, word_meanings, explanation, search_text, embedding FROM verses")
verses_rows = sqlite_cursor.fetchall()

with postgres_engine.begin() as pg_conn:
    # Clear existing verses in postgres first
    pg_conn.execute(Verse.__table__.delete())
    inserted = 0
    for row in verses_rows:
        pg_conn.execute(
            Verse.__table__.insert().values(
                id=row[0],
                chapter_number=row[1],
                verse_number=row[2],
                text_sanskrit=row[3],
                transliteration=row[4],
                english_translation=row[5],
                word_meanings=row[6],
                explanation=row[7],
                search_text=row[8],
                embedding=row[9]
            )
        )
        inserted += 1
    print(f"Migrated {inserted} verses.")

sqlite_conn.close()
print("Migration completed successfully!")
