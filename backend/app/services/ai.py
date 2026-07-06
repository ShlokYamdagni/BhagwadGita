import os
import json
import urllib.request
import numpy as np
from sqlalchemy.orm import Session
from backend.app.models.models import Verse
from backend.app.core.config import settings

# Emotion Categories
EMOTIONS = ["Fear", "Anger", "Stress", "Confusion", "Sadness", "Hope", "Joy", "Frustration"]

# Local mock responses for key themes (when GEMINI_API_KEY is not configured)
MOCK_COUNSEL_CARDS = {
    "exam": {
        "emotion": "Stress",
        "verse_chapter": 2,
        "verse_number": 47,
        "understanding": "I understand that the fear of exams and future results is weighing heavily on you. It is natural to feel anxious when so much feels out of your control.",
        "guidance": "Do not let anxiety about the grade consume your day. Break your syllabus down into small, digestible parts and focus on mastering one topic at a time. Establish a regular routine, sleep well, and remember that single-minded study is more effective than panic.",
        "meaning": "This famous verse teaches us that we only have the right to perform our actions, but we are not entitled to their results. Do not let the fruits of action be your motive, and do not be attached to inaction. By surrendering the outcome and focusing purely on the process, we free ourselves from anxiety.",
        "action": "Select one simple concept right now. Set a timer for 25 minutes, study it with full concentration, and then take a 5-minute deep-breathing break.",
        "reflection": "Your efforts are your offering. Dedicate your study to your growth, and let go of the results. You are stronger than your worries."
    },
    "anxiety": {
        "emotion": "Stress",
        "verse_chapter": 6,
        "verse_number": 6,
        "understanding": "I hear the distress in your mind. Anxiety can make you feel as if your own thoughts are working against you.",
        "guidance": "Anxiety tries to pull your attention into an imaginary future. Ground yourself in the present. Practice conscious, slow breathing. Understand that the mind is a tool; it can either be your greatest ally or your worst opponent depending on how you train it.",
        "meaning": "For those who have conquered the mind, it is the best of friends. But for those who have failed to do so, the mind remains the greatest enemy. When we take control of our habits, thoughts, and breath, we conquer the mind.",
        "action": "Sit straight, close your eyes, and inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, and hold empty for 4 seconds. Repeat this box breathing 5 times.",
        "reflection": "Peace does not come from external conditions, but from an inner mastery of your thoughts. You have the power within you to calm the storm."
    },
    "anger": {
        "emotion": "Anger",
        "verse_chapter": 2,
        "verse_number": 63,
        "understanding": "I understand that you are feeling intense anger. It is a powerful emotion that feels consuming and demands immediate reaction.",
        "guidance": "Anger cloud our judgment, leading to actions we later regret. When you feel anger rising, create a gap. Do not speak or act immediately. Take a walk, drink a glass of water, and allow your logic to catch up with your emotions.",
        "meaning": "From anger arises delusion, from delusion comes loss of memory, from loss of memory comes ruin of intellect, and from ruin of intellect, one falls down. Understanding this chain helps us see that anger is self-destructive.",
        "action": "Write down the trigger on a piece of paper, wait 10 minutes, and then throw the paper away to physically release the anger.",
        "reflection": "Holding onto anger is like holding a hot coal with the intent of throwing it at someone else; you are the one who gets burned. Choose peace."
    },
    "default": {
        "emotion": "Confusion",
        "verse_chapter": 2,
        "verse_number": 14,
        "understanding": "I hear that you are going through a difficult time. Life's uncertainties can often make us feel lost and confused.",
        "guidance": "Understand that life moves in cycles. Both pain and pleasure, success and failure, are temporary phases. Focus on staying centered, performing your duties, and letting these passing storms pass over you.",
        "meaning": "The contact of the senses with their objects gives rise to feelings of heat and cold, pleasure and pain. They are transitory, appearing and disappearing. Learn to tolerate them without being shaken.",
        "action": "Write down three things you are grateful for today to ground your perspective in what is going well.",
        "reflection": "This moment, too, shall pass. Stand firm like a mountain, and let the winds blow past."
    }
}

def detect_emotion_local(problem_text: str) -> str:
    """
    Fallback rule-based emotion detection if API key is missing.
    """
    p = problem_text.lower()
    if any(x in p for x in ["scared", "fear", "fail", "exam", "anxious", "worry", "panic", "test", "future"]):
        return "Stress"
    elif any(x in p for x in ["angry", "mad", "hate", "jealous", "annoyed", "pissed", "betray"]):
        return "Anger"
    elif any(x in p for x in ["sad", "lonely", "grief", "depressed", "heartbreak", "cry", "lost"]):
        return "Sadness"
    elif any(x in p for x in ["lazy", "procrastinate", "motivation", "discipline", "habit"]):
        return "Frustration"
    return "Confusion"

def run_local_keyword_search(query: str, db: Session) -> Verse:
    """
    Fallback keyword match scoring when vector search is not available.
    """
    query_words = [w.strip(",.?!()").lower() for w in query.split() if len(w) > 2]
    # Simple stop words list
    stop_words = {"the", "and", "for", "that", "this", "with", "have", "you", "not", "but", "are", "was"}
    words = [w for w in query_words if w not in stop_words]
    
    if not words:
        # Fallback to verse 2.47
        return db.query(Verse).filter(Verse.chapter_number == 2, Verse.verse_number == 47).first()
        
    verses = db.query(Verse).all()
    best_verse = None
    best_score = -1
    
    for v in verses:
        score = 0
        search_corpus = v.search_text.lower()
        for w in words:
            if w in search_corpus:
                score += 1
                # Give extra weight if word matches in translation
                if w in v.english_translation.lower():
                    score += 2
        
        if score > best_score:
            best_score = score
            best_verse = v
            
    return best_verse or db.query(Verse).filter(Verse.chapter_number == 2, Verse.verse_number == 47).first()

def get_gemini_embedding(text: str, api_key: str):
    """
    Generate embeddings using Gemini Embeddings API.
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
        print(f"Embedding error: {e}")
        return None

def find_relevant_verse(query: str, db: Session) -> Verse:
    """
    RAG retriever: searches the database for the most relevant verse.
    Uses vector embedding similarity if GEMINI_API_KEY is present and database has embeddings,
    otherwise falls back to keyword matching.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return run_local_keyword_search(query, db)
        
    # Generate query embedding
    query_vec = get_gemini_embedding(f"Situation counseling guidance theme: {query}", api_key)
    if not query_vec:
        return run_local_keyword_search(query, db)
        
    # Fetch all verses containing embeddings
    verses = db.query(Verse).filter(Verse.embedding.isnot(None)).all()
    if not verses:
        return run_local_keyword_search(query, db)
        
    query_arr = np.array(query_vec, dtype=np.float32)
    query_norm = np.linalg.norm(query_arr)
    
    best_verse = None
    best_sim = -1.0
    
    for v in verses:
        v_arr = np.frombuffer(v.embedding, dtype=np.float32)
        v_norm = np.linalg.norm(v_arr)
        if v_norm == 0 or query_norm == 0:
            continue
        sim = np.dot(query_arr, v_arr) / (query_norm * v_norm)
        if sim > best_sim:
            best_sim = sim
            best_verse = v
            
    return best_verse or run_local_keyword_search(query, db)

def detect_emotion(problem_text: str) -> str:
    """
    Detects emotion from text using Gemini API, or falls back to local rules.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return detect_emotion_local(problem_text)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = f"""
    Analyze the emotional tone of the following personal problem.
    Choose exactly ONE emotion from this list: {', '.join(EMOTIONS)}.
    Respond with ONLY the name of the emotion, nothing else.
    
    Problem: "{problem_text}"
    Emotion:
    """
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            emotion = res["contents"][0]["parts"][0]["text"].strip()
            if emotion in EMOTIONS:
                return emotion
    except Exception:
        pass
    return detect_emotion_local(problem_text)

def generate_spiritual_guidance(problem: str, db: Session) -> dict:
    """
    Orchestrates the full RAG pipeline:
    1. Detects emotion
    2. Retrieves matching Bhagavad Gita verse
    3. Prompts LLM to structure a response aligning with user specifications
    4. Handles fallback if Gemini API is not configured
    """
    # 1. Detect emotion
    emotion = detect_emotion(problem)
    
    # 2. Match Bhagavad Gita Verse
    verse = find_relevant_verse(problem, db)
    
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        # Check if local matches exist in mock configs
        matched_mock = None
        p_lower = problem.lower()
        if "exam" in p_lower or "test" in p_lower:
            matched_mock = MOCK_COUNSEL_CARDS["exam"]
        elif "anx" in p_lower or "panic" in p_lower or "scared" in p_lower or "stress" in p_lower:
            matched_mock = MOCK_COUNSEL_CARDS["anxiety"]
        elif "ang" in p_lower or "mad" in p_lower:
            matched_mock = MOCK_COUNSEL_CARDS["anger"]
        else:
            matched_mock = MOCK_COUNSEL_CARDS["default"]
            
        # We fetch the verse specified in mock card if available, otherwise use matched verse
        final_verse = db.query(Verse).filter(
            Verse.chapter_number == matched_mock["verse_chapter"],
            Verse.verse_number == matched_mock["verse_number"]
        ).first() or verse
        
        return {
            "emotion": matched_mock["emotion"],
            "verse_id": final_verse.id,
            "understanding": matched_mock["understanding"],
            "guidance": matched_mock["guidance"],
            "verse_info": {
                "chapter": final_verse.chapter_number,
                "verse": final_verse.verse_number,
                "sanskrit": final_verse.text_sanskrit,
                "transliteration": final_verse.transliteration,
                "translation": final_verse.english_translation
            },
            "meaning": matched_mock["meaning"],
            "action": matched_mock["action"],
            "reflection": matched_mock["reflection"]
        }
        
    # 3. Call Gemini API to generate structured response using RAG context
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    system_prompt = """
    You are a compassionate, wise, and deeply human spiritual counselor. 
    A user has approached you with a personal life challenge. 
    Your objective is to comfort, guide, and ground them using modern psychological insights combined with the timeless wisdom of the Bhagavad Gita.
    
    CRITICAL DESIGN PRINCIPLE:
    - Never force scripture. Advice comes first, scripture second.
    - Empathy first, then actionable advice, then the matched verse context, then a simple explanation, then one small immediate action, and lastly a calming, hopeful message.
    - Never preach, never judge, and never sound robotic.
    - Respectfully handle Gita teachings. If the user expresses severe distress or thoughts of self-harm, prioritize safety: encourage them to seek professional support, while still offering warm, gentle spiritual motivation.
    
    You must format your response strictly as a JSON object with the following fields:
    {
      "understanding": "A short, warm, and highly empathetic summary acknowledging their emotion and problem.",
      "guidance": "Actionable, psychologically healthy, practical guidance written in clear, simple language.",
      "meaning": "A simple explanation of why the matched Bhagavad Gita verse applies to their situation in modern English, without complex philosophical terms.",
      "action": "One very small, concrete, positive action the user can execute immediately (e.g. write down a gratitude list, do a 1-minute box breath, walk for 5 minutes).",
      "reflection": "A concluding calming, peaceful, and hopeful statement."
    }
    """
    
    user_prompt = f"""
    User Problem: "{problem}"
    Detected Emotion: "{emotion}"
    
    RAG Context - Matched Bhagavad Gita Verse:
    - Chapter: {verse.chapter_number}
    - Verse: {verse.verse_number}
    - Sanskrit: {verse.text_sanskrit}
    - Transliteration: {verse.transliteration}
    - English Translation: {verse.english_translation}
    - Word Meanings: {verse.word_meanings}
    - Commentary/Explanation: {verse.explanation}
    
    Generate the counseling response matching the requested JSON structure. Do not include markdown code block syntax (like ```json ... ```). Output raw JSON.
    """
    
    data = {
        "contents": [
            {
                "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode("utf-8"))
            raw_text = res["contents"][0]["parts"][0]["text"].strip()
            parsed_json = json.loads(raw_text)
            
            return {
                "emotion": emotion,
                "verse_id": verse.id,
                "understanding": parsed_json.get("understanding", ""),
                "guidance": parsed_json.get("guidance", ""),
                "verse_info": {
                    "chapter": verse.chapter_number,
                    "verse": verse.verse_number,
                    "sanskrit": verse.text_sanskrit,
                    "transliteration": verse.transliteration,
                    "translation": verse.english_translation
                },
                "meaning": parsed_json.get("meaning", ""),
                "action": parsed_json.get("action", ""),
                "reflection": parsed_json.get("reflection", "")
            }
    except Exception as e:
        print(f"Gemini generation or parsing failed, falling back to local mock. Error: {e}")
        # Final emergency fallback to mock card
        matched_mock = MOCK_COUNSEL_CARDS["default"]
        return {
            "emotion": emotion,
            "verse_id": verse.id,
            "understanding": matched_mock["understanding"],
            "guidance": matched_mock["guidance"],
            "verse_info": {
                "chapter": verse.chapter_number,
                "verse": verse.verse_number,
                "sanskrit": verse.text_sanskrit,
                "transliteration": verse.transliteration,
                "translation": verse.english_translation
            },
            "meaning": matched_mock["meaning"],
            "action": matched_mock["action"],
            "reflection": matched_mock["reflection"]
        }
