'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, BookOpen, Bookmark, History, Settings, LogOut, Sun, Moon,
  Volume2, VolumeX, Send, Mic, Play, Heart, Share2, Sparkles, ChevronRight,
  User, Book, Search, Check, Menu, X, ArrowLeft, Download, FileText, Globe, Home
} from 'lucide-react';
import { api, User as UserType, ChatSession, ChatMessage, Verse, DailyVerse, Bookmark as BookmarkType } from '../lib/api';

export default function MasterApp() {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- App Shell Navigation State ---
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'daily' | 'explore' | 'bookmarks' | 'history' | 'settings' | 'about'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [appTheme, setAppTheme] = useState<string>('theme-temple');

  const handleTabSelect = (tab: 'home' | 'chat' | 'daily' | 'explore' | 'bookmarks' | 'history' | 'settings' | 'about') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // --- Active Chat States ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [emotionDetected, setEmotionDetected] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);

  // --- TTS State ---
  const [isPlayingAudio, setIsPlayingAudio] = useState<number | null>(null); // messageId
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- Daily Verse States ---
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [dailyVerseLoading, setDailyVerseLoading] = useState(false);

  // --- Explore / Search States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [chapterVersesLoading, setChapterVersesLoading] = useState(false);

  // --- Bookmarks States ---
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // --- Theme State ---
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // --- Alert notifications ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Synthesis and check Auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const token = localStorage.getItem('gita_token');
      if (token) {
        loadUserProfile();
      }
      
      // Initialize theme representation
      const root = window.document.documentElement;
      if (root.classList.contains('dark')) {
        setTheme('dark');
      } else {
        setTheme('light');
      }

      // Load saved devotional theme
      const savedTheme = localStorage.getItem('gita_app_theme') || 'theme-temple';
      setAppTheme(savedTheme);

      // Close sidebar by default on mobile viewports
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Load User Info and sync sessions, bookmarks, daily verse
  const loadUserProfile = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      setIsAuthenticated(true);
      
      // Load app resources
      loadSessions();
      loadBookmarks();
      loadDailyVerse();
      loadChapters();
    } catch (e) {
      console.error('Failed to load user profile, logging out:', e);
      handleLogout();
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        await api.login(authEmail, authPassword);
        showToast('Welcome back seeker');
      } else {
        await api.register(authEmail, authPassword, authName);
        await api.login(authEmail, authPassword);
        showToast('Welcome to the path of wisdom');
      }
      await loadUserProfile();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setAuthLoading(true);
    setAuthError('');
    try {
      // Direct mock OAuth exchange
      await api.oauthLogin(provider, `mock-oauth-token-${provider}`);
      showToast(`Authenticated via ${provider === 'google' ? 'Google' : 'Apple'}`);
      await loadUserProfile();
    } catch (err: any) {
      setAuthError(err.message || 'OAuth authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    setUser(null);
    setSessions([]);
    setCurrentSession(null);
    setMessages([]);
    setInputText('');
  };

  const handleDeleteAccount = async () => {
    if (typeof window !== 'undefined') {
      const confirmDelete = window.confirm("Are you absolutely sure you want to permanently delete your Sanctuary account and purge all your bookmarks and counseling history? This cannot be undone.");
      if (confirmDelete) {
        try {
          await api.deleteMe();
          showToast('Sanctuary account permanently deleted.');
          handleLogout();
        } catch (err: any) {
          showToast('Failed to delete account.');
        }
      }
    }
  };

  // --- API Resource Fetchers ---
  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data);
      if (data.length > 0 && !currentSession) {
        // Load the most recent session by default
        handleSelectSession(data[0]);
      } else if (data.length === 0) {
        // Create an initial session
        handleNewSession();
      }
    } catch (e) {
      console.error('Error fetching sessions:', e);
    }
  };

  const loadBookmarks = async () => {
    setBookmarksLoading(true);
    try {
      const data = await api.getBookmarks();
      setBookmarks(data);
    } catch (e) {
      console.error('Error loading bookmarks:', e);
    } finally {
      setBookmarksLoading(false);
    }
  };

  const loadDailyVerse = async () => {
    setDailyVerseLoading(true);
    try {
      const data = await api.getDailyVerse();
      setDailyVerse(data);
    } catch (e) {
      console.error('Error fetching daily verse:', e);
    } finally {
      setDailyVerseLoading(false);
    }
  };

  const loadChapters = async () => {
    try {
      const data = await api.request<any[]>('/verses/chapters');
      setChapters(data);
    } catch (e) {
      console.error('Error fetching chapters:', e);
    }
  };

  const handleSelectSession = async (session: ChatSession) => {
    setCurrentSession(session);
    setChatLoading(true);
    setEmotionDetected(null);
    try {
      const history = await api.getMessages(session.id);
      setMessages(history);
      // Find the last assistant message with detected emotion
      const assistantMsgs = history.filter(m => m.role === 'assistant' && m.emotion_detected);
      if (assistantMsgs.length > 0) {
        setEmotionDetected(assistantMsgs[assistantMsgs.length - 1].emotion_detected);
      }
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSess = await api.createSession('New Session');
      setSessions(prev => [newSess, ...prev]);
      setCurrentSession(newSess);
      setMessages([]);
      setEmotionDetected(null);
      setActiveTab('chat');
    } catch (e) {
      console.error('Error creating session:', e);
    }
  };

  // --- Voice / Audio Features ---
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = user?.settings?.language === 'hindi' ? 'hi-IN' : 'en-US';

    rec.onstart = () => {
      setIsRecording(true);
      showToast('Listening to your problem...');
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    rec.start();
  };

  const speakText = (text: string, messageId: number) => {
    if (!synthRef.current) return;

    if (isPlayingAudio === messageId) {
      synthRef.current.cancel();
      setIsPlayingAudio(null);
      return;
    }

    synthRef.current.cancel(); // Stop any current speech
    
    // Extract advice and translation content from markdown to keep TTS clean
    const cleanText = text
      .replace(/###.*?\n/g, '')  // Remove headers
      .replace(/\*\*.*?\*\*/g, '') // Remove bold marks
      .replace(/>/g, '')          // Remove blockquotes
      .replace(/[*#`\-]/g, '')    // Remove other markdown chars
      .replace(/\n\s*\n/g, '. ')  // Replace double breaks with period
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 300)); // Read first 300 chars of synthesis
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setIsPlayingAudio(null);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(null);
    };

    setIsPlayingAudio(messageId);
    synthRef.current.speak(utterance);
  };

  // --- Send Message ---
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const text = (customText || inputText).trim();
    if (!text || chatLoading) return;

    if (!currentSession) {
      showToast('Please start a session first');
      return;
    }

    setInputText('');
    setChatLoading(true);

    // Append user message locally immediately for fluid response feeling
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      emotion_detected: null,
      verse_id: null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.sendMessage(currentSession.id, text);
      // Replace temporary/update message log
      setMessages(prev => prev.map(m => m.id === tempUserMsg.id ? tempUserMsg : m).concat(response));
      if (response.emotion_detected) {
        setEmotionDetected(response.emotion_detected);
      }
      // Reload sessions list to capture title changes
      loadSessions();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate guidance.');
    } finally {
      setChatLoading(false);
    }
  };

  // --- Bookmarks Handling ---
  const handleBookmarkToggle = async (verseId: number, chatMessageId?: number) => {
    const isBookmarked = bookmarks.find(b => b.verse_id === verseId);
    try {
      if (isBookmarked) {
        await api.deleteBookmark(isBookmarked.id);
        showToast('Verse removed from Favorites');
      } else {
        await api.addBookmark(verseId, chatMessageId);
        showToast('Verse saved to Favorites');
      }
      loadBookmarks();
    } catch (e) {
      showToast('Action failed');
    }
  };

  // --- Search/Explore Handlers ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 3) {
      showToast('Search query must be at least 3 characters');
      return;
    }
    setSearchLoading(true);
    try {
      const data = await api.searchVerses(searchQuery);
      setSearchResults(data);
    } catch (e) {
      showToast('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectChapter = async (chap: any) => {
    setSelectedChapter(chap);
    setChapterVersesLoading(true);
    try {
      // In a real application, fetch verses filtered by chapter
      const data = await api.request<Verse[]>(`/verses/search?q=Chapter%20${chap.chapter_number}`);
      setChapterVerses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setChapterVersesLoading(false);
    }
  };

  // --- PDF / Card Export Helper ---
  const exportCardAsText = (msg: ChatMessage) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      `GITA GUIDANCE CARD\n\nEmotion: ${msg.emotion_detected || 'Centered'}\n\nCounselor Advice:\n${msg.content}`
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Gita_Guidance_Card_${msg.id}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Saved Card successfully!');
  };

  // --- Theme Toggle ---
  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.remove('dark');
      localStorage.theme = 'light';
      setTheme('light');
    } else {
      root.classList.add('dark');
      localStorage.theme = 'dark';
      setTheme('dark');
    }
  };

  // --- Preset Problems ---
  const presetProblems = [
    { text: "I feel overwhelmed by exam stress and pressure.", icon: "🎓" },
    { text: "I am having difficulty dealing with anger and resentment.", icon: "🔥" },
    { text: "I am feeling lonely and disconnected from everyone.", icon: "🌌" },
    { text: "I am struggling with fear of failing in my new business.", icon: "📉" },
    { text: "I procrastinate and lack discipline to build good habits.", icon: "⏳" },
    { text: "I can't stop overthinking about my future career choices.", icon: "🧭" }
  ];

  // --- RENDERS ---

  // Auth Screen / Welcome landing
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-sandstone-100 dark:bg-temple-bg relative">
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] rounded-full gold-glow-orb pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full saffron-glow-orb pointer-events-none animate-pulse-glow" style={{ animationDelay: '-4s' }} />

        <div className="w-full max-w-md z-10 glass-panel border border-sandstone-200 dark:border-temple-border bg-white/70 dark:bg-temple-panel/60 p-8 rounded-2xl shadow-xl shadow-saffron-500/5 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-saffron-500/10 border border-saffron-500/30 rounded-full flex items-center justify-center mx-auto mb-4 relative shadow-inner">
              <Sparkles className="w-10 h-10 text-saffron-500 animate-pulse" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-saffron-600 dark:text-saffron-500 tracking-wide">
              Anant Gita
            </h1>
            <p className="text-sm text-sandstone-900 dark:text-gray-400 mt-2 font-light">
              Ancient Wisdom meets Modern Guidance
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-sandstone-900 dark:text-gray-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-4 py-3 bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border rounded-lg focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 transition text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-sandstone-900 dark:text-gray-400 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="seeker@gita.org"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border rounded-lg focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-sandstone-900 dark:text-gray-400 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border rounded-lg focus:outline-none focus:border-saffron-500 focus:ring-1 focus:ring-saffron-500 transition text-sm"
              />
            </div>

            {authMode === 'register' && (
              <div className="flex items-start gap-2.5 py-1">
                <input
                  id="legalCheckbox"
                  type="checkbox"
                  required
                  checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-saffron-500 rounded border-sandstone-300 dark:border-temple-border"
                />
                <label htmlFor="legalCheckbox" className="text-[10px] text-sandstone-950 dark:text-gray-400 font-light leading-snug">
                  I agree that this AI Counsel is a spiritual exploration tool and <strong>does not replace psychiatric or clinical medical therapy</strong>.
                </label>
              </div>
            )}

            {authError && (
              <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg text-center font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-saffron-500 hover:bg-saffron-600 active:scale-95 text-white font-medium rounded-lg transition shadow-md shadow-saffron-500/20 text-sm flex items-center justify-center gap-2"
            >
              {authLoading ? 'Aligning...' : authMode === 'login' ? 'Enter Sanctuary' : 'Begin Journey'}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 h-[1px] bg-sandstone-200 dark:bg-temple-border"></span>
            <span className="relative bg-sandstone-100 dark:bg-[#121622] px-3 text-xs text-sandstone-900 dark:text-gray-400">or continue with</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center gap-2 py-2.5 border border-sandstone-200 dark:border-temple-border bg-white dark:bg-temple-panel hover:bg-sandstone-50 dark:hover:bg-temple-border rounded-lg transition text-xs font-medium"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuthLogin('apple')}
              className="flex items-center justify-center gap-2 py-2.5 border border-sandstone-200 dark:border-temple-border bg-white dark:bg-temple-panel hover:bg-sandstone-50 dark:hover:bg-temple-border rounded-lg transition text-xs font-medium"
            >
              Apple
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-saffron-600 dark:text-saffron-400 hover:underline font-medium"
            >
              {authMode === 'login' ? "Don't have an account? Start here" : 'Already on the path? Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Dashboard App Shell
  return (
    <div className={`h-screen flex overflow-hidden ${appTheme} bg-[url('/images/sanctuary_bg.png')] bg-cover bg-center bg-no-repeat`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-saffron-500 text-white rounded-lg shadow-lg shadow-saffron-500/30 text-xs font-medium flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <div className={`fixed md:relative inset-y-0 left-0 z-40 bg-white dark:bg-[#121622] md:bg-white/70 md:dark:bg-temple-panel/60 border-r border-sandstone-200 dark:border-temple-border transition-all duration-300 transform md:transform-none flex flex-col justify-between h-full shadow-2xl md:shadow-none ${
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
      }`}>
        <div>
          {/* Logo Brand */}
          <div className="p-4 border-b border-sandstone-200 dark:border-temple-border flex items-center gap-3">
            <div className="w-10 h-10 bg-saffron-500/10 border border-saffron-500/30 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-saffron-500" />
            </div>
            {isSidebarOpen && (
              <div>
                <span className="font-serif text-lg font-bold tracking-wide text-saffron-500 block">Anant Gita</span>
                <span className="text-[10px] text-sandstone-900 dark:text-gray-400 block tracking-tight">Wise Counsel AI</span>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => handleTabSelect('home')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'home' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <Home className="w-5 h-5" />
              <span>Sanctuary Home</span>
            </button>

            <button
              onClick={() => handleTabSelect('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'chat' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <MessageSquare className="w-5 h-5" />
              {isSidebarOpen && <span>AI Spiritual Chat</span>}
            </button>

            <button
              onClick={() => handleTabSelect('daily')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'daily' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <BookOpen className="w-5 h-5" />
              {isSidebarOpen && <span>Daily Verse</span>}
            </button>

            <button
              onClick={() => handleTabSelect('explore')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'explore' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <Search className="w-5 h-5" />
              {isSidebarOpen && <span>Scripture Search</span>}
            </button>

            <button
              onClick={() => handleTabSelect('bookmarks')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'bookmarks' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <Bookmark className="w-5 h-5" />
              {isSidebarOpen && <span>Favorites</span>}
            </button>

            <button
              onClick={() => handleTabSelect('history')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'history' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <History className="w-5 h-5" />
              {isSidebarOpen && <span>Past Sessions</span>}
            </button>

            <button
              onClick={() => handleTabSelect('about')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'about' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <Book className="w-5 h-5" />
              {isSidebarOpen && <span>Gita Chapters</span>}
            </button>

            <button
              onClick={() => handleTabSelect('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-medium ${activeTab === 'settings' ? 'bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 border-l-2 border-saffron-500' : 'text-sandstone-900 dark:text-gray-300 hover:bg-sandstone-200/50 dark:hover:bg-temple-border'}`}
            >
              <Settings className="w-5 h-5" />
              {isSidebarOpen && <span>Sanctuary Config</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-sandstone-200 dark:border-temple-border">
          {isSidebarOpen && user && (
            <div className="flex items-center gap-2 mb-3 px-2">
              <div className="w-8 h-8 rounded-full bg-saffron-500/20 text-saffron-600 flex items-center justify-center font-bold">
                {user.full_name?.charAt(0) || user.email.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold block truncate">{user.full_name || 'Seeker'}</span>
                <span className="text-[10px] text-sandstone-950 dark:text-gray-400 block truncate">{user.email}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span>Leave Sanctuary</span>}
          </button>
        </div>
      </div>

      {/* Main Workspace Panel */}
      <div className="flex-1 flex flex-col overflow-hidden soothing-overlay relative">
        {/* Header Bar */}
        <header className="h-16 border-b border-sandstone-200 dark:border-temple-border bg-white dark:bg-temple-panel px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg border border-sandstone-200 dark:border-temple-border text-sandstone-900 dark:text-gray-400 hover:bg-sandstone-200/50 dark:hover:bg-temple-border transition"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="font-serif text-lg font-bold text-saffron-600 dark:text-saffron-500 tracking-wide uppercase">
              {activeTab === 'home' && 'Sanctuary Home'}
              {activeTab === 'chat' && (currentSession?.title || 'Counsel Sanctuary')}
              {activeTab === 'daily' && 'Daily reflection'}
              {activeTab === 'explore' && 'Scripture library'}
              {activeTab === 'bookmarks' && 'Favorites list'}
              {activeTab === 'history' && 'Past consultations'}
              {activeTab === 'settings' && 'Configure sanctuary'}
              {activeTab === 'about' && '18 Chapters of Gita'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'chat' && emotionDetected && (
              <span className="px-3 py-1 bg-saffron-500/10 border border-saffron-500/20 text-saffron-500 rounded-full text-[10px] uppercase font-bold tracking-wider animate-pulse">
                Emotion: {emotionDetected}
              </span>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-sandstone-200 dark:hover:bg-temple-border text-sandstone-900 dark:text-gray-400 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Tab View Switcher */}
        <main className="flex-1 overflow-y-auto p-6 z-0">
          {/* Welcome Dashboard Tab */}
          {activeTab === 'home' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Personalized Welcome Card */}
              <div className="bg-white dark:bg-temple-panel border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-saffron-600 dark:text-saffron-500 mb-1">
                    Welcome to the Sanctuary, {user?.full_name || 'Seeker'}
                  </h3>
                  <p className="text-xs text-sandstone-950 dark:text-gray-300 font-light leading-relaxed max-w-xl">
                    Take a moment to breathe deeply. This is a private space to reflect, read scriptures, and navigate life's challenges with the eternal wisdom of the Bhagavad Gita.
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-sandstone-50 dark:bg-temple-bg p-4 rounded-xl border border-sandstone-200 dark:border-temple-border shrink-0">
                  <div className="text-center">
                    <span className="block font-serif text-2xl font-bold text-saffron-500">{sessions.length}</span>
                    <span className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Sessions</span>
                  </div>
                  <div className="w-px h-8 bg-sandstone-200 dark:bg-temple-border" />
                  <div className="text-center">
                    <span className="block font-serif text-2xl font-bold text-saffron-500">{bookmarks.length}</span>
                    <span className="block text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Bookmarks</span>
                  </div>
                </div>
              </div>

              {/* Grid Layout for Daily Verse and Direct Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Daily Reflection Block */}
                <div className="lg:col-span-2 bg-white dark:bg-temple-panel border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-sandstone-200 dark:border-temple-border">
                    <span className="text-xs font-semibold tracking-wider uppercase text-saffron-500 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> Daily Reflection Verse
                    </span>
                    <button
                      onClick={() => handleTabSelect('daily')}
                      className="text-[10px] font-semibold text-saffron-600 dark:text-saffron-500 hover:underline flex items-center gap-0.5"
                    >
                      Read full commentary <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {dailyVerseLoading ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-[10px] text-gray-400">Fetching daily wisdom...</p>
                    </div>
                  ) : dailyVerse ? (
                    <div className="space-y-4">
                      <div className="bg-sandstone-50 dark:bg-temple-bg p-4 rounded-xl border border-sandstone-200 dark:border-temple-border text-center">
                        <p className="font-serif text-base leading-loose font-semibold tracking-wide text-saffron-700 dark:text-saffron-400 whitespace-pre-line animate-fade-in">
                          {dailyVerse.text_sanskrit}
                        </p>
                      </div>
                      <div className="text-xs space-y-2">
                        <p className="font-medium text-saffron-600 dark:text-saffron-500">
                          Ch {dailyVerse.chapter_number}, Verse {dailyVerse.verse_number}
                        </p>
                        <p className="text-sandstone-950 dark:text-gray-300 italic font-light leading-relaxed">
                          "{dailyVerse.english_translation}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 py-6 text-center">Connection to sanctuary database failed. Please refresh.</p>
                  )}
                </div>

                {/* Direct Action Hub */}
                <div className="bg-white dark:bg-temple-panel border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-saffron-600 dark:text-saffron-500 mb-2">Sanctuary Actions</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed font-light mb-4">
                      Choose a path of reflection or seek active guidance for your current mental stress or life problems.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleTabSelect('chat')}
                      className="w-full py-2.5 px-4 bg-saffron-500 text-white rounded-xl text-xs font-semibold hover:bg-saffron-600 transition flex items-center justify-between shadow-md shadow-saffron-500/10"
                    >
                      <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Seek AI Counsel</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => handleTabSelect('explore')}
                      className="w-full py-2.5 px-4 bg-sandstone-50 dark:bg-temple-bg text-sandstone-900 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-sandstone-100 dark:hover:bg-temple-border border border-sandstone-200 dark:border-temple-border transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Search Scripture Library</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleTabSelect('about')}
                      className="w-full py-2.5 px-4 bg-sandstone-50 dark:bg-temple-bg text-sandstone-900 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-sandstone-100 dark:hover:bg-temple-border border border-sandstone-200 dark:border-temple-border transition flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2"><Book className="w-4 h-4" /> Browse Gita Chapters</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col">
              {/* Message Display Area */}
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto text-center">
                  <div className="w-16 h-16 bg-saffron-500/10 border border-saffron-500/20 rounded-full flex items-center justify-center mb-6">
                    <Sparkles className="w-8 h-8 text-saffron-500" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3">Speak of your heart's burden</h3>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 mb-8 max-w-md font-light leading-relaxed">
                    This sanctuary is completely private and secure. Share your stresses, anxiety, doubts, anger, or fears. Let the Gita guide your perspective.
                  </p>
                  
                  {/* Preset Buttons Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    {presetProblems.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(undefined, p.text)}
                        className="p-3 border border-sandstone-200 dark:border-temple-border bg-white dark:bg-temple-panel hover:border-saffron-500/50 hover:bg-saffron-500/5 dark:hover:bg-saffron-500/5 text-left rounded-xl transition text-xs font-light leading-snug flex items-start gap-2.5"
                      >
                        <span className="text-sm shrink-0">{p.icon}</span>
                        <span>{p.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-6 pb-24 max-w-3xl mx-auto w-full">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 shrink-0 bg-saffron-500/10 border border-saffron-500/30 rounded-full flex items-center justify-center text-saffron-500 font-bold">
                          ॐ
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl p-5 border text-sm font-light leading-relaxed relative ${msg.role === 'user' ? 'bg-saffron-500/10 border-saffron-500/20 text-saffron-600 dark:text-saffron-300' : 'bg-white dark:bg-[#121622] border-sandstone-200 dark:border-temple-border'}`}>
                        {/* Render Counselor Markdown Card */}
                        <div className="whitespace-pre-wrap markdown-content">
                          {msg.content}
                        </div>

                        {msg.role === 'assistant' && (
                          <div className="mt-4 pt-3 border-t border-sandstone-200 dark:border-temple-border flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => speakText(msg.content, msg.id)}
                              className="p-1 px-2 border border-sandstone-200 dark:border-temple-border rounded-md hover:bg-sandstone-50 dark:hover:bg-temple-border text-sandstone-950 dark:text-gray-400 transition flex items-center gap-1.5"
                            >
                              {isPlayingAudio === msg.id ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                              <span>{isPlayingAudio === msg.id ? 'Stop' : 'Listen'}</span>
                            </button>

                            {msg.verse_id && (
                              <button
                                onClick={() => handleBookmarkToggle(msg.verse_id!, msg.id)}
                                className="p-1 px-2 border border-sandstone-200 dark:border-temple-border rounded-md hover:bg-sandstone-50 dark:hover:bg-temple-border text-sandstone-950 dark:text-gray-400 transition flex items-center gap-1.5"
                              >
                                <Heart className={`w-3.5 h-3.5 ${bookmarks.some(b => b.verse_id === msg.verse_id) ? 'fill-red-500 text-red-500' : ''}`} />
                                <span>Save</span>
                              </button>
                            )}

                            <button
                              onClick={() => exportCardAsText(msg)}
                              className="p-1 px-2 border border-sandstone-200 dark:border-temple-border rounded-md hover:bg-sandstone-50 dark:hover:bg-temple-border text-sandstone-950 dark:text-gray-400 transition flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Save Text</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex gap-4 justify-start">
                      <div className="w-8 h-8 shrink-0 bg-saffron-500/10 border border-saffron-500/30 rounded-full flex items-center justify-center text-saffron-500 font-bold animate-pulse">
                        ॐ
                      </div>
                      <div className="bg-white dark:bg-temple-panel/30 border border-sandstone-200 dark:border-temple-border rounded-2xl p-5 text-sm font-light text-sandstone-950 dark:text-gray-400 flex items-center gap-2 w-48">
                        <span className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        <span>Contemplating Gita...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Chat Input Floating Panel */}
              <div className="absolute bottom-6 left-6 right-6 max-w-3xl mx-auto w-full">
                <form onSubmit={handleSendMessage} className="relative flex items-center bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border rounded-xl shadow-lg shadow-saffron-500/5 px-2 py-2">
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-sandstone-900 dark:text-gray-400 hover:bg-sandstone-50 dark:hover:bg-temple-border'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder={isRecording ? "Listening..." : "Tell the counselor: I feel worried about my career path..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-grow px-3 bg-transparent text-sm focus:outline-none placeholder:text-sandstone-950/60 dark:placeholder:text-gray-400/60"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !inputText.trim()}
                    className="p-2.5 bg-saffron-500 hover:bg-saffron-600 disabled:bg-saffron-500/50 text-white rounded-lg transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'daily' && (
            <div className="max-w-2xl mx-auto">
              {dailyVerseLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light">Retrieving daily scripture...</p>
                </div>
              ) : dailyVerse ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border rounded-2xl p-8 shadow-xl shadow-saffron-500/5 relative overflow-hidden"
                >
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-saffron-500/20 rounded-tr-2xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-saffron-500/20 rounded-bl-2xl pointer-events-none" />

                  <div className="text-center mb-8">
                    <span className="text-[10px] tracking-widest font-bold uppercase text-saffron-500 block mb-1">Verse of the day</span>
                    <h3 className="font-serif text-xl text-saffron-600 dark:text-saffron-500 font-bold">
                      Chapter {dailyVerse.chapter_number} Verse {dailyVerse.verse_number}
                    </h3>
                  </div>

                  {/* Sanskrit verse block */}
                  <div className="bg-saffron-500/5 dark:bg-saffron-500/5 p-6 rounded-xl border border-saffron-500/10 text-center mb-6">
                    <p className="font-serif text-lg leading-loose font-semibold tracking-wide text-saffron-700 dark:text-saffron-400 whitespace-pre-line mb-4">
                      {dailyVerse.text_sanskrit}
                    </p>
                    <p className="text-xs italic text-sandstone-950 dark:text-gray-400 whitespace-pre-line font-light">
                      {dailyVerse.transliteration}
                    </p>
                  </div>

                  <div className="space-y-6 text-sm font-light leading-relaxed">
                    <div>
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-saffron-600 dark:text-saffron-500 mb-2">Translation</h4>
                      <p className="text-sandstone-900 dark:text-gray-200 italic font-medium">"{dailyVerse.english_translation}"</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-saffron-600 dark:text-saffron-500 mb-2">Swami Sivananda Explanation</h4>
                      <p className="text-sandstone-900 dark:text-gray-300 font-light">{dailyVerse.explanation}</p>
                    </div>

                    <hr className="border-sandstone-200 dark:border-temple-border" />

                    <div className="bg-saffron-500/5 p-5 rounded-xl border-l-4 border-saffron-500">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-saffron-600 dark:text-saffron-400 mb-2">Daily Reflection</h4>
                      <p className="text-sandstone-900 dark:text-gray-200 mb-4">{dailyVerse.daily_reflection}</p>
                      
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-saffron-600 dark:text-saffron-400 mb-1">Today's Action</h4>
                      <p className="text-sandstone-900 dark:text-gray-200 flex items-start gap-2">
                        <span className="text-saffron-500 font-bold shrink-0">👉</span>
                        <span>{dailyVerse.daily_action}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end gap-2">
                    <button
                      onClick={() => handleBookmarkToggle(dailyVerse.verse_id)}
                      className="px-4 py-2 border border-sandstone-200 dark:border-temple-border rounded-xl text-xs font-semibold hover:bg-sandstone-100 dark:hover:bg-temple-border transition flex items-center gap-1.5"
                    >
                      <Heart className={`w-3.5 h-3.5 ${bookmarks.some(b => b.verse_id === dailyVerse.verse_id) ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{bookmarks.some(b => b.verse_id === dailyVerse.verse_id) ? 'Saved' : 'Save to favorites'}</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <p className="text-center text-xs text-sandstone-950 dark:text-gray-400 py-12">No verse available.</p>
              )}
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Search Header */}
              <div className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-sandstone-950/60 dark:text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search verses: type keywords like 'action', 'fear', 'mind', 'desire'..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border rounded-xl text-xs focus:outline-none focus:border-saffron-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-saffron-500 hover:bg-saffron-600 text-white rounded-xl text-xs font-semibold shadow-md transition shrink-0"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Search Results Area */}
              {searchLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light">Searching scriptures...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-widest text-saffron-500">Search Results ({searchResults.length})</h3>
                  {searchResults.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-xl relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-serif text-sm font-semibold text-saffron-500">
                          Chapter {v.chapter_number} Verse {v.verse_number}
                        </span>
                        <button
                          onClick={() => handleBookmarkToggle(v.id)}
                          className="p-1.5 hover:bg-sandstone-50 dark:hover:bg-temple-border rounded-full transition text-sandstone-950 dark:text-gray-400"
                        >
                          <Heart className={`w-4 h-4 ${bookmarks.some(b => b.verse_id === v.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>
                      </div>
                      <p className="font-serif text-base text-saffron-700 dark:text-saffron-400 mb-3 whitespace-pre-line leading-relaxed">
                        {v.text_sanskrit}
                      </p>
                      <p className="text-xs italic text-sandstone-950 dark:text-gray-400 mb-3">
                        {v.transliteration}
                      </p>
                      <p className="text-xs font-light text-sandstone-900 dark:text-gray-200 mb-3">
                        "{v.english_translation}"
                      </p>
                      <details className="text-xs text-sandstone-950 dark:text-gray-400 font-light cursor-pointer">
                        <summary className="font-semibold text-saffron-500 hover:underline">Show Sivananda Commentary</summary>
                        <p className="mt-2 pl-3 border-l-2 border-saffron-500/30 leading-relaxed">
                          {v.explanation}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !searchLoading ? (
                <p className="text-center text-xs text-sandstone-950 dark:text-gray-400 py-12">No verses matched your search terms.</p>
              ) : null}

              {/* Browse Chapters Grid */}
              {!searchQuery && (
                <div className="space-y-4">
                  <h3 className="text-xs uppercase font-bold tracking-widest text-saffron-500">Browse Chapter List</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chapters.map((chap) => (
                      <div
                        key={chap.id}
                        onClick={() => handleSelectChapter(chap)}
                        className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-5 rounded-xl hover:border-saffron-500/40 transition cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] tracking-widest font-bold uppercase text-saffron-500">Chapter {chap.chapter_number}</span>
                            <span className="text-[10px] bg-sandstone-100 dark:bg-temple-border px-2 py-0.5 rounded text-sandstone-950 dark:text-gray-400 font-semibold">{chap.verses_count} verses</span>
                          </div>
                          <h4 className="font-serif text-base font-bold mb-1">{chap.name_translation}</h4>
                          <h5 className="text-xs italic text-sandstone-950 dark:text-gray-400 mb-3">{chap.name_transliteration} ({chap.name})</h5>
                          <p className="text-[11px] font-light text-sandstone-950 dark:text-gray-400 leading-relaxed line-clamp-3">
                            {chap.summary}
                          </p>
                        </div>
                        <span className="text-[10px] text-saffron-500 font-bold hover:underline self-end mt-4 flex items-center gap-1">
                          Explore verses <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verses inside selected chapter dialog overlay */}
              {selectedChapter && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
                  <div className="w-full max-w-lg bg-white dark:bg-temple-panel p-6 overflow-y-auto flex flex-col justify-between h-full border-l border-sandstone-200 dark:border-temple-border">
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <button
                          onClick={() => setSelectedChapter(null)}
                          className="flex items-center gap-1 text-xs text-saffron-500 font-semibold hover:underline"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back to chapters
                        </button>
                        <span className="text-xs bg-saffron-500/10 text-saffron-500 px-2 py-0.5 rounded font-bold">
                          Ch {selectedChapter.chapter_number}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl font-bold mb-1">{selectedChapter.name_translation}</h3>
                      <h4 className="text-xs italic text-sandstone-950 dark:text-gray-400 mb-6">{selectedChapter.name_transliteration}</h4>

                      {chapterVersesLoading ? (
                        <div className="text-center py-12">
                          <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light">Loading verses...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chapterVerses.map((v) => (
                            <div key={v.id} className="p-4 bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-bold text-saffron-500">Verse {v.verse_number}</span>
                                <button onClick={() => handleBookmarkToggle(v.id)} className="text-sandstone-950 dark:text-gray-400 hover:text-red-500">
                                  <Heart className={`w-3.5 h-3.5 ${bookmarks.some(b => b.verse_id === v.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                </button>
                              </div>
                              <p className="font-serif text-sm text-saffron-700 dark:text-saffron-400 mb-2 whitespace-pre-line leading-relaxed">{v.text_sanskrit}</p>
                              <p className="text-[11px] text-sandstone-900 dark:text-gray-200 font-light">"{v.english_translation}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {bookmarksLoading ? (
                <div className="text-center py-12">
                  <div className="w-10 h-10 border-2 border-saffron-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light">Loading favorites...</p>
                </div>
              ) : bookmarks.length > 0 ? (
                bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl relative shadow-md shadow-saffron-500/5 overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-serif text-sm font-semibold text-saffron-500">
                        Chapter {bm.verse.chapter_number} Verse {bm.verse.verse_number}
                      </span>
                      <button
                        onClick={() => handleBookmarkToggle(bm.verse_id)}
                        className="text-red-500 p-1.5 hover:bg-red-500/10 rounded-full transition"
                      >
                        <Heart className="w-4 h-4 fill-red-500" />
                      </button>
                    </div>
                    <p className="font-serif text-base text-saffron-700 dark:text-saffron-400 mb-3 whitespace-pre-line leading-relaxed">
                      {bm.verse.text_sanskrit}
                    </p>
                    <p className="text-xs italic text-sandstone-950 dark:text-gray-400 mb-3">
                      {bm.verse.transliteration}
                    </p>
                    <p className="text-xs font-light text-sandstone-900 dark:text-gray-200 mb-3">
                      "{bm.verse.english_translation}"
                    </p>
                    <hr className="my-3 border-sandstone-200 dark:border-temple-border" />
                    <h5 className="text-xs font-semibold text-saffron-500 mb-1">Swami Sivananda Explanation</h5>
                    <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light leading-relaxed">
                      {bm.verse.explanation}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full border border-sandstone-200 dark:border-temple-border flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-6 h-6 text-sandstone-950 dark:text-gray-400" />
                  </div>
                  <h4 className="font-serif text-lg font-semibold mb-1">No favorites saved</h4>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light max-w-sm mx-auto">
                    During a chat, click the Save button on any counselor guidance card to bookmark your scriptures here.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-xl mx-auto space-y-4">
              {sessions.length > 0 ? (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`p-4 border rounded-xl hover:border-saffron-500/40 bg-white dark:bg-[#121622] transition cursor-pointer flex justify-between items-center ${currentSession?.id === sess.id ? 'border-saffron-500 shadow-sm ring-1 ring-saffron-500' : 'border-sandstone-200 dark:border-temple-border'}`}
                  >
                    <div className="overflow-hidden pr-4 flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-saffron-500 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-semibold block truncate">{sess.title}</span>
                        <span className="text-[10px] text-sandstone-950 dark:text-gray-400 block mt-0.5">
                          Started: {new Date(sess.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sandstone-950 dark:text-gray-400" />
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-sandstone-950 dark:text-gray-400 py-12">No chat sessions record found.</p>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5">
                <h3 className="font-serif text-xl font-bold text-saffron-600 dark:text-saffron-500 mb-3">Understanding the Shrimad Bhagavad Gita</h3>
                <p className="text-xs text-sandstone-900 dark:text-gray-300 font-light leading-relaxed mb-4">
                  The Bhagavad Gita is a 700-verse Hindu scripture that is part of the epic Mahabharata. It takes the form of a dialogue between Pandava prince Arjuna and his guide and charioteer Lord Krishna on the battlefield of Kurukshetra.
                </p>
                <p className="text-xs text-sandstone-900 dark:text-gray-300 font-light leading-relaxed">
                  Confronted with the duty to fight his relatives in a righteous war, Arjuna is filled with doubt, despair, and grief. Krishna's counsel forms the teachings of the Gita, covering self-realization, duty (Dharma), action (Karma Yoga), knowledge (Jnana Yoga), and devotion (Bhakti Yoga).
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-widest text-saffron-500">The 18 Chapters and Yogas</h4>
                <div className="space-y-3">
                  {chapters.map((chap) => (
                    <div key={chap.id} className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-5 rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-serif text-sm font-semibold text-saffron-500">
                          Chapter {chap.chapter_number}: {chap.name_translation}
                        </h5>
                        <span className="text-[10px] bg-sandstone-50 dark:bg-temple-bg border border-sandstone-200 dark:border-temple-border px-2 py-0.5 rounded text-sandstone-950 dark:text-gray-400 font-semibold">{chap.verses_count} verses</span>
                      </div>
                      <h6 className="text-[11px] italic text-sandstone-950 dark:text-gray-400 mb-2">{chap.name_transliteration} ({chap.name})</h6>
                      <p className="text-xs font-light text-sandstone-950 dark:text-gray-400 leading-relaxed">
                        {chap.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Profile card summary */}
              {user && (
                <div className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 text-center">
                  <div className="w-16 h-16 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-500 font-bold text-2xl flex items-center justify-center mx-auto mb-3">
                    {user.full_name?.charAt(0) || user.email.charAt(0)}
                  </div>
                  <h4 className="font-serif text-lg font-bold">{user.full_name || 'Seeker'}</h4>
                  <p className="text-xs text-sandstone-950 dark:text-gray-400 font-light mb-4">{user.email}</p>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-sandstone-200 dark:border-temple-border text-xs">
                    <div className="p-3 bg-sandstone-50 dark:bg-temple-bg rounded-lg border border-sandstone-200 dark:border-temple-border">
                      <span className="block text-sandstone-950 dark:text-gray-400 mb-0.5">Sanctuary streak</span>
                      <span className="text-base font-bold text-saffron-500">4 Days 🔥</span>
                    </div>
                    <div className="p-3 bg-sandstone-50 dark:bg-temple-bg rounded-lg border border-sandstone-200 dark:border-temple-border">
                      <span className="block text-sandstone-950 dark:text-gray-400 mb-0.5">Verses Bookmarked</span>
                      <span className="text-base font-bold text-saffron-500">{bookmarks.length} saved</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Customizations Card */}
              <div className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 space-y-4">
                <h4 className="font-serif text-base font-bold text-saffron-600 dark:text-saffron-500">System Options</h4>

                {/* Theme Selector */}
                <div className="flex justify-between items-center py-2.5 border-b border-sandstone-200 dark:border-temple-border">
                  <div className="text-xs">
                    <span className="block font-semibold">Active Color Theme</span>
                    <span className="block text-[10px] text-sandstone-950 dark:text-gray-400">Toggle dark and light view modes</span>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="p-2 border border-sandstone-200 dark:border-temple-border rounded-lg bg-sandstone-50 dark:bg-temple-bg hover:bg-sandstone-100 dark:hover:bg-temple-border transition flex items-center gap-1.5 text-xs"
                  >
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                  </button>
                </div>

                {/* Krishna Devotional Themes */}
                <div className="py-2.5 border-b border-sandstone-200 dark:border-temple-border">
                  <div className="text-xs mb-3">
                    <span className="block font-semibold">Gita Devotional Aura</span>
                    <span className="block text-[10px] text-sandstone-950 dark:text-gray-400">Select Lord Krishna spiritual themes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setAppTheme('theme-temple'); localStorage.setItem('gita_app_theme', 'theme-temple'); showToast('Aura: Temple Saffron'); }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left flex flex-col gap-1 transition ${appTheme === 'theme-temple' ? 'border-saffron-500 bg-saffron-500/10' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      <span className="font-bold text-saffron-500">Temple Saffron</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-light">Classic sandstone & orange</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setAppTheme('theme-peacock'); localStorage.setItem('gita_app_theme', 'theme-peacock'); showToast('Aura: Mayur Pankh'); }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left flex flex-col gap-1 transition ${appTheme === 'theme-peacock' ? 'border-saffron-500 bg-saffron-500/10' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      <span className="font-bold text-teal-500 dark:text-teal-400">Mayur Pankh</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-light">Krishna peacock teal & gold</span>
                    </button>
  
                    <button
                      type="button"
                      onClick={() => { setAppTheme('theme-forest'); localStorage.setItem('gita_app_theme', 'theme-forest'); showToast('Aura: Vrindavan Dham'); }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left flex flex-col gap-1 transition ${appTheme === 'theme-forest' ? 'border-saffron-500 bg-saffron-500/10' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      <span className="font-bold text-green-500 dark:text-green-400">Vrindavan Dham</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-light">Tulsi forest green & marigold</span>
                    </button>
  
                    <button
                      type="button"
                      onClick={() => { setAppTheme('theme-dwarka'); localStorage.setItem('gita_app_theme', 'theme-dwarka'); showToast('Aura: Dwaraka Ocean'); }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left flex flex-col gap-1 transition ${appTheme === 'theme-dwarka' ? 'border-saffron-500 bg-saffron-500/10' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      <span className="font-bold text-blue-500 dark:text-blue-400">Dwaraka Ocean</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-light">Royal copper & turquoise sea</span>
                    </button>
  
                    <button
                      type="button"
                      onClick={() => { setAppTheme('theme-kurukshetra'); localStorage.setItem('gita_app_theme', 'theme-kurukshetra'); showToast('Aura: Kurukshetra Fire'); }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left flex flex-col gap-1 transition ${appTheme === 'theme-kurukshetra' ? 'border-saffron-500 bg-saffron-500/10' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      <span className="font-bold text-orange-500 dark:text-orange-400">Kurukshetra Fire</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-light">Crimson chariot & holy flame</span>
                    </button>
                  </div>
                </div>

                {/* Language Select */}
                <div className="flex justify-between items-center py-2.5 border-b border-sandstone-200 dark:border-temple-border">
                  <div className="text-xs">
                    <span className="block font-semibold">Translation Language</span>
                    <span className="block text-[10px] text-sandstone-950 dark:text-gray-400">Language for Gita explanations</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={async () => {
                        if (user) {
                          const updated = await api.updateSettings({ language: 'english' });
                          setUser(updated);
                          showToast('Sanctuary language: English');
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${user?.settings?.language === 'english' ? 'bg-saffron-500 text-white border-saffron-500' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={async () => {
                        if (user) {
                          const updated = await api.updateSettings({ language: 'hindi' });
                          setUser(updated);
                          showToast('Sanctuary language: Hindi');
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${user?.settings?.language === 'hindi' ? 'bg-saffron-500 text-white border-saffron-500' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                    >
                      Hindi
                    </button>
                  </div>
                </div>

                {/* Audio Enabled */}
                <div className="flex justify-between items-center py-2.5 border-b border-sandstone-200 dark:border-temple-border">
                  <div className="text-xs">
                    <span className="block font-semibold">Text to Speech Reading</span>
                    <span className="block text-[10px] text-sandstone-950 dark:text-gray-400">Configure default voice output</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (user) {
                        const nextVoice = !user.settings.voice_enabled;
                        const updated = await api.updateSettings({ voice_enabled: nextVoice });
                        setUser(updated);
                        showToast(`Voice output: ${nextVoice ? 'ON' : 'OFF'}`);
                      }
                    }}
                    className={`p-2 border rounded-lg transition flex items-center gap-1.5 text-xs ${user?.settings?.voice_enabled ? 'border-saffron-500 bg-saffron-500/10 text-saffron-600 dark:text-saffron-400' : 'border-sandstone-200 dark:border-temple-border hover:bg-sandstone-50 dark:hover:bg-temple-bg'}`}
                  >
                    {user?.settings?.voice_enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>{user?.settings?.voice_enabled ? 'Audio On' : 'Audio Off'}</span>
                  </button>
                </div>

                {/* Account Purge and GDPR option */}
                <div className="flex justify-between items-center py-2.5">
                  <div className="text-xs">
                    <span className="block font-semibold text-red-500">Purge Personal Account</span>
                    <span className="block text-[10px] text-sandstone-950 dark:text-gray-400">Delete profile and wipe chat sessions permanently</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    className="px-3 py-2 border border-red-500/30 rounded-lg hover:bg-red-500/10 text-red-500 text-xs transition"
                  >
                    Delete Account
                  </button>
                </div>
              </div>

              {/* Legal Disclaimer & Attributions Card */}
              <div className="bg-white dark:bg-[#121622] border border-sandstone-200 dark:border-temple-border p-6 rounded-2xl shadow-xl shadow-saffron-500/5 space-y-3 text-[11px] font-light leading-relaxed text-sandstone-950 dark:text-gray-400">
                <h5 className="font-serif text-xs font-bold text-saffron-500 uppercase tracking-wider mb-2">Legal Notices & IP Credits</h5>
                
                <div>
                  <span className="block font-semibold text-sandstone-900 dark:text-gray-300 mb-0.5">Medical & Psychological Disclaimer:</span>
                  <p>
                    Anant Gita is an AI-driven spiritual guidance and philosophical assistant. It provides suggestions based on historical scriptures and does not constitute psychiatric diagnosis, clinical counseling, therapy, or professional medical treatment. If you are experiencing thoughts of self-harm or severe clinical depression, please contact emergency medical services or a professional psychiatrist immediately.
                  </p>
                </div>

                <div className="pt-2 border-t border-sandstone-200 dark:border-temple-border">
                  <span className="block font-semibold text-sandstone-900 dark:text-gray-300 mb-0.5">Copyrights & Scripture Attribution:</span>
                  <p>
                    The Bhagavad Gita Sanskrit verses, transliterations, word meanings, and English translations/commentaries are compiled from the translations of <strong>Swami Sivananda</strong>, courtesy of the <strong>Divine Life Society</strong>. We deeply respect and attribute all copyrights of these scholarly commentaries to their respective owners.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
