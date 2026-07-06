const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL}/api`;

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  settings: {
    theme: string;
    language: string;
    voice_enabled: boolean;
  };
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface Verse {
  id: number;
  chapter_number: number;
  verse_number: number;
  text_sanskrit: string;
  transliteration: string;
  english_translation: string;
  word_meanings: string;
  explanation: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  emotion_detected: string | null;
  verse_id: number | null;
  created_at: string;
  verse?: Verse;
}

export interface DailyVerse {
  verse_id: number;
  chapter_number: number;
  verse_number: number;
  text_sanskrit: string;
  transliteration: string;
  english_translation: string;
  word_meanings: string;
  explanation: string;
  daily_reflection: string;
  daily_action: string;
  date: string;
}

export interface Bookmark {
  id: number;
  user_id: number;
  verse_id: number;
  chat_message_id: number | null;
  created_at: string;
  verse: Verse;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gita_token');
    }
    return null;
  }

  private getHeaders(contentType: string = 'application/json') {
    const headers: Record<string, string> = {};
    if (contentType !== 'multipart/form-data') {
      headers['Content-Type'] = contentType;
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${path}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return {} as T;
      }

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Request failed';
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.detail || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      return await response.json();
    } catch (e) {
      console.error(`API Client error on ${path}:`, e);
      throw e;
    }
  }

  // --- Auth Endpoints ---
  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const url = `${API_URL}/auth/login`;
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = 'Login failed';
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.detail || errMsg;
      } catch {
        errMsg = errText || errMsg;
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem('gita_token', data.access_token);
    }
    return data;
  }

  async register(email: string, password: string, fullName?: string): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async deleteMe(): Promise<void> {
    await this.request<void>('/auth/me', {
      method: 'DELETE',
    });
  }

  async updateSettings(settings: { theme?: string; language?: string; voice_enabled?: boolean }): Promise<User> {
    return this.request<User>('/auth/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async oauthLogin(provider: string, token: string): Promise<{ access_token: string; token_type: string }> {
    const data = await this.request<{ access_token: string; token_type: string }>(`/auth/oauth/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ access_token: token, token_type: 'bearer' }),
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('gita_token', data.access_token);
    }
    return data;
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gita_token');
    }
  }

  // --- Chat Endpoints ---
  async getSessions(): Promise<ChatSession[]> {
    return this.request<ChatSession[]>('/chat/sessions');
  }

  async createSession(title: string): Promise<ChatSession> {
    return this.request<ChatSession>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/sessions/${sessionId}`);
  }

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/chat/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // --- Bookmarks Endpoints ---
  async getBookmarks(): Promise<Bookmark[]> {
    return this.request<Bookmark[]>('/chat/bookmarks');
  }

  async addBookmark(verseId: number, chatMessageId?: number): Promise<Bookmark> {
    return this.request<Bookmark>('/chat/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ verse_id: verseId, chat_message_id: chatMessageId }),
    });
  }

  async deleteBookmark(bookmarkId: number): Promise<void> {
    return this.request<void>(`/chat/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  }

  // --- Verses Endpoints ---
  async getDailyVerse(): Promise<DailyVerse> {
    return this.request<DailyVerse>('/verses/daily');
  }

  async getVerse(chapter: number, verse: number): Promise<Verse> {
    return this.request<Verse>(`/verses/${chapter}/${verse}`);
  }

  async searchVerses(query: string): Promise<Verse[]> {
    return this.request<Verse[]>(`/verses/search?q=${encodeURIComponent(query)}`);
  }
}

export const api = new ApiClient();
export default api;
