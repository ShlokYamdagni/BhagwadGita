def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "seeker@test.org", "password": "securepassword", "full_name": "Test Seeker"}
    )
    assert response.status_code == 251 or response.status_code == 201
    data = response.json()
    assert data["email"] == "seeker@test.org"
    assert "id" in data
    assert "password_hash" not in data

def test_login_user(client):
    # Register user first
    client.post(
        "/api/auth/register",
        json={"email": "seeker@test.org", "password": "securepassword", "full_name": "Test Seeker"}
    )
    
    # Login
    response = client.post(
        "/api/auth/login",
        data={"username": "seeker@test.org", "password": "securepassword"}
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

def test_read_user_me(client):
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
    
    # Get Profile
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    profile = response.json()
    assert profile["email"] == "seeker@test.org"
    assert profile["full_name"] == "Test Seeker"

def test_update_settings(client):
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
    
    # Update Theme to Light and Voice enabled
    response = client.put(
        "/api/auth/settings",
        json={"theme": "light", "voice_enabled": True},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    updated = response.json()
    assert updated["settings"]["theme"] == "light"
    assert updated["settings"]["voice_enabled"] is True
