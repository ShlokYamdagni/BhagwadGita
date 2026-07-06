def test_chat_flow(client):
    # 1. Register and login
    client.post(
        "/api/auth/register",
        json={"email": "seeker@test.org", "password": "securepassword", "full_name": "Test Seeker"}
    )
    login_resp = client.post(
        "/api/auth/login",
        data={"username": "seeker@test.org", "password": "securepassword"}
    )
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Chat Session
    session_resp = client.post(
        "/api/chat/sessions",
        json={"title": "Test Session"},
        headers=auth_headers
    )
    assert session_resp.status_code == 251 or session_resp.status_code == 201
    session_id = session_resp.json()["id"]
    
    # 3. Send message (problems)
    msg_resp = client.post(
        f"/api/chat/sessions/{session_id}/message",
        json={"content": "I am worried about my exams and futures"},
        headers=auth_headers
    )
    assert msg_resp.status_code == 200
    msg_data = msg_resp.json()
    assert msg_data["role"] == "assistant"
    assert "Bhagavad Gita" in msg_data["content"]
    assert msg_data["emotion_detected"] is not None
    assert msg_data["verse_id"] is not None
    
    # 4. Get session history
    history_resp = client.get(
        f"/api/chat/sessions/{session_id}",
        headers=auth_headers
    )
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) == 2 # 1 User message + 1 AI response
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

def test_bookmarks_management(client):
    # Register and login
    client.post(
        "/api/auth/register",
        json={"email": "seeker@test.org", "password": "securepassword", "full_name": "Test Seeker"}
    )
    login_resp = client.post(
        "/api/auth/login",
        data={"username": "seeker@test.org", "password": "securepassword"}
    )
    token = login_resp.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # Add Bookmark (using seeded verse ID = 1)
    bm_resp = client.post(
        "/api/chat/bookmarks",
        json={"verse_id": 1},
        headers=auth_headers
    )
    assert bm_resp.status_code == 251 or bm_resp.status_code == 201
    bm_data = bm_resp.json()
    assert bm_data["verse_id"] == 1
    assert "verse" in bm_data
    assert bm_data["verse"]["verse_number"] == 1
    
    # Get Bookmarks
    get_resp = client.get(
        "/api/chat/bookmarks",
        headers=auth_headers
    )
    assert get_resp.status_code == 200
    bookmarks = get_resp.json()
    assert len(bookmarks) == 1
    assert bookmarks[0]["verse_id"] == 1
    
    # Delete Bookmark
    del_resp = client.delete(
        f"/api/chat/bookmarks/{bm_data['id']}",
        headers=auth_headers
    )
    assert del_resp.status_code == 204
