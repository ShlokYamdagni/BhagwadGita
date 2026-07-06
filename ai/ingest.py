import os
import json
import urllib.request
import sqlite3
import numpy as np

# URLs for the raw datasets
DATA_URLS = {
    "chapters": "https://raw.githubusercontent.com/praneshp1org/Bhagavad-Gita-JSON-data/main/chapters.json",
    "verses": "https://raw.githubusercontent.com/praneshp1org/Bhagavad-Gita-JSON-data/main/verse.json",
    "translations": "https://raw.githubusercontent.com/praneshp1org/Bhagavad-Gita-JSON-data/main/translation.json",
    "commentaries": "https://raw.githubusercontent.com/praneshp1org/Bhagavad-Gita-JSON-data/main/commentary.json"
}

CACHE_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "gita.db"))

def download_file(url, filename, encoding="utf-8"):
    os.makedirs(CACHE_DIR, exist_ok=True)
    filepath = os.path.join(CACHE_DIR, filename)
    
    if os.path.exists(filepath):
        print(f"Loading {filename} from cache...")
        with open(filepath, "r", encoding=encoding) as f:
            return json.load(f)
            
    print(f"Downloading {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as response:
            content = response.read().decode(encoding)
            # Cache the file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return json.loads(content)
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        raise

def get_gemini_embedding(text, api_key):
    """
    Generate embeddings using Google Gemini Embeddings API (text-embedding-004)
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    data = {
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{"text": text}]
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["embedding"]["values"]
    except Exception as e:
        print(f"Gemini Embedding generation error: {e}")
        return None

def main():
    print("Starting Bhagavad Gita Dataset Ingestion...")
    
    # 1. Download/Load raw data
    chapters_data = download_file(DATA_URLS["chapters"], "chapters.json")
    verses_raw = download_file(DATA_URLS["verses"], "verses.json")
    translations_raw = download_file(DATA_URLS["translations"], "translations.json", encoding="utf-8-sig")
    commentaries_raw = download_file(DATA_URLS["commentaries"], "commentaries.json", encoding="utf-8-sig")
    
    # 2. Process translations
    # We want English translations. Prioritize Swami Sivananda, fallback to others if needed.
    # Group translations by verse_id
    translations_by_verse = {}
    for item in translations_raw:
        v_id = item.get("verse_id")
        if not v_id:
            continue
        
        lang = item.get("lang", "").lower()
        author = item.get("authorName", "")
        desc = item.get("description", "").strip()
        
        if lang == "english":
            if v_id not in translations_by_verse:
                translations_by_verse[v_id] = []
            translations_by_verse[v_id].append({
                "author": author,
                "text": desc
            })
            
    # Process commentaries
    # Group commentaries by verse_id (prioritize Sivananda in English)
    commentaries_by_verse = {}
    for item in commentaries_raw:
        v_id = item.get("verse_id")
        if not v_id:
            continue
        
        lang = item.get("lang", "").lower()
        author = item.get("authorName", "")
        desc = item.get("description", "").strip()
        
        if lang == "english":
            if v_id not in commentaries_by_verse:
                commentaries_by_verse[v_id] = []
            commentaries_by_verse[v_id].append({
                "author": author,
                "text": desc
            })

    # Helper function to find Sivananda or fallback translation
    def get_english_translation(v_id):
        options = translations_by_verse.get(v_id, [])
        if not options:
            return ""
        # Find Swami Sivananda
        for opt in options:
            if "sivananda" in opt["author"].lower():
                return opt["text"]
        # Fallback to first English translation
        return options[0]["text"]

    # Helper function to find Sivananda or fallback commentary
    def get_english_commentary(v_id):
        options = commentaries_by_verse.get(v_id, [])
        if not options:
            return ""
        # Find Swami Sivananda
        for opt in options:
            if "sivananda" in opt["author"].lower():
                return opt["text"]
        # Fallback to first English commentary
        return options[0]["text"]

    # 3. Create database directory & tables
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    print(f"Creating database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create chapters table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chapters (
        id INTEGER PRIMARY KEY,
        chapter_number INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        name_transliteration TEXT NOT NULL,
        name_translation TEXT NOT NULL,
        verses_count INTEGER NOT NULL,
        summary TEXT NOT NULL
    )
    """)
    
    # Create verses table (with embedding stored as BLOB or text JSON)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_number INTEGER NOT NULL,
        verse_number INTEGER NOT NULL,
        text_sanskrit TEXT NOT NULL,
        transliteration TEXT NOT NULL,
        english_translation TEXT NOT NULL,
        word_meanings TEXT NOT NULL,
        explanation TEXT NOT NULL,
        search_text TEXT NOT NULL,
        embedding BLOB,
        UNIQUE(chapter_number, verse_number)
    )
    """)
    
    # Populate chapters
    print("Populating chapters table...")
    for ch in chapters_data:
        cursor.execute("""
        INSERT OR REPLACE INTO chapters (id, chapter_number, name, name_transliteration, name_translation, verses_count, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            ch.get("id"),
            ch.get("chapter_number"),
            ch.get("name"),
            ch.get("name_transliterated"),
            ch.get("name_meaning"),
            ch.get("verses_count"),
            ch.get("chapter_summary")
        ))

    # Populate verses
    print("Populating verses table...")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY environment variable not found. Ingestion will run without pre-computing embeddings.")
        print("Embeddings can be generated dynamically at runtime or by running this script again with the API key set.")
        
    inserted_count = 0
    for v in verses_raw:
        v_id = v.get("id")
        ch_num = v.get("chapter_number")
        v_num = v.get("verse_number")
        sanskrit = v.get("text", "").strip()
        translit = v.get("transliteration", "").strip()
        meanings = v.get("word_meanings", "").strip()
        
        translation = get_english_translation(v_id)
        explanation = get_english_commentary(v_id)
        
        # Combine texts for the RAG search corpus
        search_text = f"Chapter {ch_num} Verse {v_num}. Transliteration: {translit}. Translation: {translation}. Meaning: {meanings}. Explanation: {explanation}"
        
        embedding_blob = None
        if api_key:
            # Let's generate embeddings
            print(f"Generating embedding for Chapter {ch_num} Verse {v_num}...")
            # We embed the translation + explanation for semantic matching of user situations
            embed_input = f"Situation counseling guidance theme: {translation} {explanation}"
            vec = get_gemini_embedding(embed_input, api_key)
            if vec:
                # Convert array of floats to float32 binary blob
                embedding_blob = np.array(vec, dtype=np.float32).tobytes()
        
        cursor.execute("""
        INSERT OR REPLACE INTO verses (chapter_number, verse_number, text_sanskrit, transliteration, english_translation, word_meanings, explanation, search_text, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ch_num,
            v_num,
            sanskrit,
            translit,
            translation,
            meanings,
            explanation,
            search_text,
            embedding_blob
        ))
        inserted_count += 1
        
    conn.commit()
    conn.close()
    
    print(f"Successfully ingested {inserted_count} verses and chapters into {DB_PATH}.")
    print("Ingestion pipeline finished successfully.")

if __name__ == "__main__":
    main()
