def test_get_chapters(client):
    response = client.get("/api/verses/chapters")
    assert response.status_code == 200
    chapters = response.json()
    assert len(chapters) == 1
    assert chapters[0]["chapter_number"] == 1
    assert chapters[0]["name_translation"] == "Arjuna's Dilemma"

def test_get_daily_verse(client):
    response = client.get("/api/verses/daily")
    assert response.status_code == 200
    daily = response.json()
    assert "verse_id" in daily
    assert daily["chapter_number"] == 1
    assert daily["verse_number"] == 1
    assert "daily_reflection" in daily
    assert "daily_action" in daily

def test_search_verses(client):
    # Search for "holy" (which is in our seeded verse search_text)
    response = client.get("/api/verses/search?q=holy")
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["chapter_number"] == 1
    assert results[0]["verse_number"] == 1

def test_get_verse_detail(client):
    response = client.get("/api/verses/1/1")
    assert response.status_code == 200
    verse = response.json()
    assert verse["chapter_number"] == 1
    assert verse["verse_number"] == 1
    assert verse["english_translation"] == "Gathered on the holy plain of Kurukshetra..."

    # Test not found
    not_found = client.get("/api/verses/1/99")
    assert not_found.status_code == 404
