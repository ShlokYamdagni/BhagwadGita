# System Architecture - Shrimad Bhagavad Gita Counselor

This document outlines the architecture, data models, and system flows of the AI Spiritual Guidance Application.

---

## 1. System Topology

The application is structured as a decoupled monorepo, separating Client (SPA), Server (FastAPI), Ingestion Engine, and Database.

```mermaid
graph TD
    subgraph Client Layer (Next.js)
        UI[SPA Frontend]
        AuthStore[LocalStorage JWT]
        TTS[Web Speech Synthesizer]
        STT[Web Speech Recognition]
    end

    subgraph Service Layer (FastAPI)
        API[API Router / core]
        AuthServ[Auth & Settings]
        ChatServ[Counselor Session Manager]
        RAG[RAG Retrieval Core]
    end

    subgraph Database Layer
        SQLite[(SQLite gita.db)]
        Postgres[(PostgreSQL)]
    end

    subgraph AI Foundation (Google AI Studio)
        Gemini[Gemini 2.5 Flash]
        Embeddings[text-embedding-004]
    end

    UI -->|JSON API / Auth Headers| API
    STT -->|Speech-to-text transcript| UI
    API --> AuthServ
    API --> ChatServ
    ChatServ --> RAG
    RAG -->|Semantic Embeddings search| SQLite
    RAG -->|Fallback query match| Postgres
    RAG -->|Generate guidance| Gemini
    RAG -->|Embed search phrase| Embeddings
```

---

## 2. RAG & AI Pipeline

### 2.1 Ingestion Flow
1. **Source Data**: Downloads standard JSON lists of chapters, verses, Swami Sivananda's English translations, and commentaries.
2. **Merge Pipeline**: Integrates fields into a single corpus string per verse:
   `Chapter X Verse Y. Transliteration: ... Translation: ... Explanation: ...`
3. **Pre-computation**: Generates dense vector representations using Gemini's `text-embedding-004` (768 dimensions) when an API key is supplied.
4. **Storage**: Saves text details and embedding vectors (as binary float32 blobs) into the SQL schema.

### 2.2 Retrieval & Synthesis Flow
When a user submits a personal problem (e.g., *"I feel anxious about my job interview"*):
1. **Emotion Analysis**: An LLM call classifies the core sentiment into one of: `Fear`, `Anger`, `Stress`, `Confusion`, `Sadness`, `Hope`, `Joy`, or `Frustration`.
2. **Dense Vector Search**: Generates an embedding of the query, loads the verse embeddings, and calculates the **Cosine Similarity** matrix via `numpy`.
3. **Keyword Overlap Fallback**: If vector search is unavailable, computes word-frequency intersections, prioritizing words matching within translations.
4. **Synthesis Prompt**: Bundles the matched scripture text, translation, commentary, user problem, and detected emotion. Calls the LLM to format a JSON matching the structured counseling guidelines.

---

## 3. Database Schema Mapping

```mermaid
erDiagram
    users {
        int id PK
        string email UNIQUE
        string password_hash
        string full_name
        jsonb settings
    }
    chat_sessions {
        uuid id PK
        int user_id FK
        string title
    }
    chat_messages {
        int id PK
        uuid session_id FK
        string role
        text content
        string emotion_detected
        int verse_id FK
    }
    verses {
        int id PK
        int chapter_number
        int verse_number
        text text_sanskrit
        text transliteration
        text english_translation
        text word_meanings
        text explanation
        blob embedding
    }
    bookmarks {
        int id PK
        int user_id FK
        int verse_id FK
        int chat_message_id FK
    }

    users ||--o{ chat_sessions : "starts"
    users ||--o{ bookmarks : "saves"
    chat_sessions ||--|{ chat_messages : "contains"
    chat_messages }|--|| verses : "references"
    bookmarks }|--|| verses : "favors"
```

---

## 4. Key Design Decisions

### 4.1 Hybrid Search Fallback Engine
To ensure immediate portability (allowing a developer to run the project without a pgvector server or an active Gemini API key), the backend automatically checks DB vectors. If missing, it transparently falls back to an optimized word-matching search.

### 4.2 SQLite Default / PostgreSQL Support
SQLAlchemy connections check `DATABASE_URL`. If a PostgreSQL service is configured, it binds schemas. If missing, it writes to a local SQLite cache. This guarantees zero-config bootstrap.

### 4.3 Web Speech API Integration
Rather than implementing server-heavy speech transcribing (Whisper API) and speech generating (gTTS/ElevenLabs), the client leverages browser-native speech synthesis and speech recognition. This reduces server costs to zero, removes latency, and increases responsiveness.
