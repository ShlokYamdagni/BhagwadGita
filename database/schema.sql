-- Enable extension for vector embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{"theme": "system", "language": "english", "voice_enabled": false}'::jsonb
);

-- 2. Chapters table (Bhagavad Gita metadata)
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    chapter_number INT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_transliteration VARCHAR(255) NOT NULL,
    name_translation VARCHAR(255) NOT NULL,
    verses_count INT NOT NULL,
    summary TEXT NOT NULL
);

-- 3. Verses table
CREATE TABLE IF NOT EXISTS verses (
    id SERIAL PRIMARY KEY,
    chapter_number INT NOT NULL,
    verse_number INT NOT NULL,
    text_sanskrit TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    english_translation TEXT NOT NULL,
    word_meanings TEXT NOT NULL,
    explanation TEXT NOT NULL,
    search_text TEXT NOT NULL,
    embedding vector(768), -- Matches standard Gemini embedding dimension (768 for text-embedding-004)
    UNIQUE(chapter_number, verse_number)
);

-- Indexes for fast verse retrieval
CREATE INDEX IF NOT EXISTS idx_verses_chapter_verse ON verses(chapter_number, verse_number);
CREATE INDEX IF NOT EXISTS idx_verses_text_search ON verses USING gin(to_tsvector('english', search_text));

-- 4. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    emotion_detected VARCHAR(50), -- fear, anger, stress, confusion, joy, etc.
    verse_id INT REFERENCES verses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session-based message ordering
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- 6. Bookmarks / Favorites
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    verse_id INT REFERENCES verses(id) ON DELETE CASCADE,
    chat_message_id INT REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, verse_id)
);
