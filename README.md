# Shrimad Bhagavad Gita - AI Spiritual Guidance

A production-ready AI Spiritual Guidance Application that combines practical guidance with the timeless wisdom of the Bhagavad Gita. The application uses Next.js (TypeScript, Tailwind, Framer Motion) on the frontend and FastAPI (Python, RAG embeddings pipeline) on the backend.

---

## 🌟 Product Vision & Design Philosophy
This application provides peaceful, wise, and deeply human spiritual counseling. The system's main principle is: **Advice comes first, scripture provides timeless perspective**. It does not preach; it listens, empathizes, recommends real-world actions, and backs them with the specific context of the Gita.

The UI design is inspired by ancient Indian aesthetics (palm leaf manuscripts, saffron, deep blue, sandstone, copper, and soft golden lighting) rendered through a modern, glassmorphic dark/light mode layout.

---

## 📂 Repository Directory Layout

*   `/frontend` — Next.js single page application (SPA) with routing, chat interface, explore mode, history, audio TTS.
*   `/backend` — FastAPI service handling authentication, semantic search (RAG), user database records, and AI completions.
*   `/ai` — Bhagavad Gita dataset files and ingestion scripts for vector index generation.
*   `/database` — Schema files for SQL database layout.
*   `/deployment` — Docker configurations (Dockerfile, docker-compose) and CI/CD config.
*   `/documentation` — Detailed architecture diagrams, API references, and developer guidelines.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   PostgreSQL (Optional — falls back automatically to SQLite locally)

### Setup & Ingestion
1.  Clone the repository and copy the environment template:
    ```bash
    cp .env.example .env
    ```
2.  Set up the backend virtual environment:
    ```bash
    cd backend
    python -m venv venv
    venv\Scripts\activate   # On Windows
    pip install -r requirements.txt
    ```
3.  Ingest the Bhagavad Gita dataset and build the semantic database:
    ```bash
    cd ../ai
    python ingest.py
    ```
4.  Run the FastAPI Backend:
    ```bash
    cd ../backend
    python -m uvicorn app.main:app --reload
    ```
5.  Run the Next.js Frontend:
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛡️ License
Licensed under the MIT License.
