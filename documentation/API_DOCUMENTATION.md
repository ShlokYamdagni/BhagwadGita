# API Documentation - Shrimad Bhagavad Gita Counselor

This document outlines the API endpoints, schemas, parameters, and response structures for the FastAPI Backend.

The interactive docs are also available at `/docs` (Swagger UI) or `/redoc` when running the application.

---

## 1. Authentication Endpoints

### 1.1 User Registration
*   **Method**: `POST`
*   **Path**: `/api/auth/register`
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123",
      "full_name": "Arjun"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Arjun",
      "avatar_url": null,
      "settings": {
        "theme": "system",
        "language": "english",
        "voice_enabled": false
      },
      "created_at": "2026-07-06T13:00:00Z"
    }
    ```

### 1.2 User Login (Token Generation)
*   **Method**: `POST`
*   **Path**: `/api/auth/login`
*   **Request Form Data**:
    *   `username` (email address)
    *   `password`
*   **Response (200 OK)**:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer"
    }
    ```

### 1.3 Get Current Profile
*   **Method**: `GET`
*   **Path**: `/api/auth/me`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK)**:
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "Arjun",
      "avatar_url": null,
      "settings": {
        "theme": "system",
        "language": "english",
        "voice_enabled": false
      },
      "created_at": "2026-07-06T13:00:00Z"
    }
    ```

### 1.4 Update Settings
*   **Method**: `PUT`
*   **Path**: `/api/auth/settings`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body**:
    ```json
    {
      "theme": "dark",
      "language": "hindi",
      "voice_enabled": true
    }
    ```
*   **Response (200 OK)**: Updates settings and returns the complete updated profile JSON.

---

## 2. Chat & Counseling Endpoints

### 2.1 Start New Session
*   **Method**: `POST`
*   **Path**: `/api/chat/sessions`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body**:
    ```json
    {
      "title": "New Session"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "id": "a9d7b931-1ff5-4e78-bde8-d142b781bc32",
      "title": "New Session",
      "created_at": "2026-07-06T13:05:00Z"
    }
    ```

### 2.2 List Sessions
*   **Method**: `GET`
*   **Path**: `/api/chat/sessions`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK)**: A list of session objects.

### 2.3 Send Problem (Counsel)
*   **Method**: `POST`
*   **Path**: `/api/chat/sessions/{session_id}/message`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body**:
    ```json
    {
      "content": "I am scared of failing my exams tomorrow."
    }
    ```
*   **Response (200 OK)**: Returns the AI message object. The response text is a structured Markdown card formatted as:
    1. Empathy
    2. Guidance
    3. Bhagavad Gita Verse & Translation
    4. Simple Modern explanation
    5. Immediate action item
    6. Concluding reflection
    ```json
    {
      "id": 14,
      "role": "assistant",
      "content": "Warm empathy... study one topic at a time... Gita Chapter 2 Verse 47...",
      "emotion_detected": "Stress",
      "verse_id": 47,
      "created_at": "2026-07-06T13:06:00Z"
    }
    ```

---

## 3. Bookmarks / Favorites Endpoints

### 3.1 Bookmark a Verse
*   **Method**: `POST`
*   **Path**: `/api/chat/bookmarks`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Request Body**:
    ```json
    {
      "verse_id": 47,
      "chat_message_id": 14
    }
    ```
*   **Response (201 Created)**: Bookmark summary with complete verse details.

### 3.2 List Bookmarks
*   **Method**: `GET`
*   **Path**: `/api/chat/bookmarks`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (200 OK)**: List of saved bookmarks containing verses.

### 3.3 Delete Bookmark
*   **Method**: `DELETE`
*   **Path**: `/api/chat/bookmarks/{bookmark_id}`
*   **Headers**: `Authorization: Bearer <JWT_TOKEN>`
*   **Response (204 No Content)**: Deletes bookmark.

---

## 4. Gita Scripture Endpoints

### 4.1 Daily Verse
*   **Method**: `GET`
*   **Path**: `/api/verses/daily`
*   **Response (200 OK)**: Returns a pseudo-random seed-based daily verse containing sanskrit, transliteration, Swami Sivananda's explanation, and custom reflections/action items.

### 4.2 Search Scriptures
*   **Method**: `GET`
*   **Path**: `/api/verses/search`
*   **Query Parameters**:
    *   `q`: search string (must be >= 3 characters)
*   **Response (200 OK)**: List of up to 30 matching verses.

### 4.3 Get Verse Details
*   **Method**: `GET`
*   **Path**: `/api/verses/{chapter}/{verse_number}`
*   **Response (200 OK)**: Detailed verse object.
