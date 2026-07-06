# Developer Guide - AI Spiritual Guidance Application

This guide contains step-by-step instructions to configure and run the application locally for active development.

---

## 1. Local Environment Setup

### 1.1 Python Backend Setup (FastAPI)
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **Mac/Linux**:
        ```bash
        source venv/bin/activate
        ```
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### 1.2 Ingestion & Index Creation
The backend reads from a local SQLite database (`backend/gita.db`) if no PostgreSQL server is configured in `.env`.
To download the raw data from GitHub, compile chapters and verses, and populate the SQLite database, run the ingestion script:
1.  Go to the `ai` directory:
    ```bash
    cd ../ai
    ```
2.  Run the ingestion script (you can set the `GEMINI_API_KEY` first to embed vectors!):
    ```bash
    # (Optional) Set your API key
    # Windows: $env:GEMINI_API_KEY="your_api_key"
    # Linux: export GEMINI_API_KEY="your_api_key"
    
    python ingest.py
    ```
    This generates a fully populated database at `backend/gita.db`.

### 1.3 Node.js Frontend Setup (Next.js)
1.  Navigate to the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

---

## 2. Launching Services Locally

### 2.1 Start Backend (FastAPI)
From the `backend` folder with your virtual environment activated:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
*   API root: `http://localhost:8000`
*   Interactive Docs: `http://localhost:8000/docs`

### 2.2 Start Frontend (Next.js)
From the `frontend` folder:
```bash
npm run dev
```
*   Frontend Dev URL: `http://localhost:3000`

---

## 3. Running Test Suites

Run pytest from the project root workspace with pythonpath configured:
*   **Windows (PowerShell)**:
    ```powershell
    $env:PYTHONPATH="."
    python -m pytest tests/
    ```
*   **Mac/Linux**:
    ```bash
    PYTHONPATH=. python -m pytest tests/
    ```

---

## 4. Customizing AI Prompt Structure
The core counseling prompt resides in `backend/app/services/ai.py` under the function `generate_spiritual_guidance()`. You can modify the system prompt to adjust the empathy-first counsel ratio, safety guidelines, and parsing structures.

---

## 5. Troubleshooting Guide

### 5.1 email-validator dependency
Pydantic EmailStr checks fail if `email-validator` is missing. Ensure `pip install email-validator` was executed inside your virtualenv.

### 5.2 SQLite Database Path issues
If the backend throws "tables not found", verify that you ran `python ai/ingest.py` to create `backend/gita.db`. If you start the backend from another working directory, uvicorn may search for the DB in an incorrect location. The backend uses absolute path resolution to guarantee it opens `backend/gita.db` safely.
