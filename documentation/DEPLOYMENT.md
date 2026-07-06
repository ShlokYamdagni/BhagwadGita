# Deployment Guide - AI Spiritual Guidance Application

This document outlines deployment configurations, container builds, reverse proxy rules, and workflows for launching the application in a production environment.

---

## 1. Containerized Stack (Docker Compose)

The easiest way to run the production stack is using Docker Compose. The `deployment/docker-compose.yml` ties the frontend, backend, PostgreSQL (with pgvector), and Redis caches together.

### 1.1 Local Run with Compose
1.  Copy and fill out the environment file at the root:
    ```bash
    cp .env.example .env
    ```
2.  Set your `GEMINI_API_KEY` inside `.env`.
3.  Launch the services from the `deployment` directory:
    ```bash
    cd deployment
    docker-compose up --build -d
    ```
4.  This spins up:
    *   **PostgreSQL + pgvector** on port `5432`
    *   **Redis** on port `6379`
    *   **FastAPI Backend** on port `8000`
    *   **Next.js Frontend** on port `3000`

---

## 2. Production Architecture

In a production environment (such as AWS EC2, DigitalOcean, or Google Cloud Run), you should route all requests through a reverse proxy.

```
                  [ Internet (HTTPS) ]
                           │
                           ▼
                 [ Nginx Reverse Proxy ]
                 (Port 80/443 SSL/TLS)
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    [ Next.js Frontend ]       [ FastAPI Backend ]
      (Node Port 3000)          (Uvicorn Port 8000)
                                        │
                               ┌────────┴────────┐
                               │                 │
                               ▼                 ▼
                         [ PostgreSQL ]       [ Redis ]
                        (Port 5432 Vector)  (Port 6379 Cache)
```

---

## 3. CI/CD Pipeline (GitHub Actions)

The repository comes configured with a GitHub Actions workflow in `.github/workflows/ci-cd.yml`.
This workflow automatically triggers on every push or pull request to the `main` or `master` branches:
1.  **Backend CI**: Builds the Python environment, resolves imports, runs static checks, and executes `pytest` tests.
2.  **Frontend CI**: Installs node modules and verifies that the Next.js production build (`npm run build`) compiles successfully without any TypeScript or bundling errors.

---

## 4. Production Security Hardening

For production environments, ensure you perform the following hardening steps:

### 4.1 CORS Restrictions
In `backend/app/main.py`, restrict `allow_origins` to your absolute frontend domains (e.g., `["https://gita-counselor.app"]`) instead of allowing all origins `["*"]`.

### 4.2 Secure JWT
Generate a secure, random 256-bit JWT secret:
```bash
openssl rand -hex 32
```
Inject this key via your environment variables (`JWT_SECRET`) instead of using the default values.

### 4.3 Database Backups
Schedule daily cron jobs to dump your PostgreSQL database using `pg_dump` to an off-site cloud storage (e.g., AWS S3).
