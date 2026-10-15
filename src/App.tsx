import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  ApsModelId,
  InteractionMode,
  ChatMessage,
  Attachment,
  VisualCustomization,
  UserAccount,
  CookiePreferences,
  AppSettings,
  MemoryItem,
} from './types';
import { DEFAULT_CUSTOMIZATION } from './constants/themePresets';
import { Header } from './components/Header';
import { ChatTimeline } from './components/ChatTimeline';
import { InputDock } from './components/InputDock';
import { CliConsole } from './components/CliConsole';
import { Sidebar } from './components/Sidebar';
import { CustomizerModal } from './components/CustomizerModal';
import { AuthModal } from './components/AuthModal';
import { AuthGateway } from './components/AuthGateway';
import { LegalModals } from './components/LegalModals';

export default function App() {
  const [currentModel, setCurrentModel] = useState<ApsModelId>('APS PRO');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => {
    return (localStorage.getItem('aps_mode') as InteractionMode) || 'code';
  });
  const [activeView, setActiveView] = useState<'chat' | 'cli'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const handleSelectMode = (mode: InteractionMode) => {
    setInteractionMode(mode);
    localStorage.setItem('aps_mode', mode);
  };

  const handleSelectView = (view: 'chat' | 'cli') => {
    setActiveView(view);
    if (view === 'cli') {
      setCurrentModel('APS HARD WORK');
      setInteractionMode('code');
    }
  };

  // Modals state
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // CLI Code state
  const [cliInitialCode, setCliInitialCode] = useState<string>('');
  const [cliInitialLang, setCliInitialLang] = useState<string>('typescript');

  // Background Terminal Context State: persistent across views so switching to CHAT never stops CLI operations
  const [terminalContext, setTerminalContext] = useState<{
    files: { filename: string; language: string; code: string }[];
    recentLogs: { type: string; text: string }[];
    isExecuting: boolean;
    lastCommand: string;
  }>({
    files: [],
    recentLogs: [],
    isExecuting: false,
    lastCommand: '',
  });

  const handleTerminalStateUpdate = React.useCallback(
    (cliState: {
      files: any[];
      terminalLogs: any[];
      isProcessing: boolean;
      lastCommand: string;
    }) => {
      setTerminalContext({
        files: cliState.files.map((f: any) => ({
          filename: f.filename,
          language: f.language,
          code: f.code,
        })),
        recentLogs: cliState.terminalLogs.slice(-15).map((l: any) => ({
          type: l.type,
          text: l.text,
        })),
        isExecuting: cliState.isProcessing,
        lastCommand: cliState.lastCommand,
      });
    },
    []
  );

  // Mouse coords for liquid glass reflection
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // 1. Visual Customization State
  const [customization, setCustomization] = useState<VisualCustomization>(() => {
    const saved = localStorage.getItem('aps_customization');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Sin themeId = personalizacion vieja (mezclaba estilos): se descarta.
        if (parsed && parsed.themeId) return { ...DEFAULT_CUSTOMIZATION, ...parsed };
        localStorage.removeItem('aps_customization');
      } catch {
        // ignore
      }
    }
    return DEFAULT_CUSTOMIZATION;
  });

  // Propaga el tema elegido a TODA la interfaz (incluye modales y menus)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = customization.themeId || 'custom';
    root.style.setProperty('--bg-deep', customization.bgColor);
    root.style.setProperty('--accent', customization.accentColor);
    root.style.setProperty('--accent-2', customization.accentColor2 || customization.accentColor);
    root.style.setProperty(
      '--accent-2-soft',
      customization.accentColor2Soft || customization.accentColor2 || customization.accentColor
    );
    root.style.setProperty('--glass-border', customization.glassBorderColor);
  }, [
    customization.themeId,
    customization.bgColor,
    customization.accentColor,
    customization.accentColor2,
    customization.accentColor2Soft,
    customization.glassBorderColor,
  ]);

  // Save customization to localStorage
  const handleUpdateCustomization = (updated: Partial<VisualCustomization>) => {
    setCustomization((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('aps_customization', JSON.stringify(next));
      return next;
    });
  };

  const handleResetCustomization = () => {
    setCustomization(DEFAULT_CUSTOMIZATION);
    localStorage.removeItem('aps_customization');
  };

  // 2. User Authentication State (Firebase connected)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('aps_current_user') || sessionStorage.getItem('aps_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email === 'tizsedoff@gmail.com') {
          parsed.isAdmin = true;
          parsed.membership = 'ADMINISTRADOR SUPREMO';
        }
        return parsed;
      } catch {
        // ignore
      }
    }
    // Real login: start as null so unauthenticated visitors see AuthGateway
    return null;
  });

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    try {
      auth.signOut();
    } catch {}
    localStorage.removeItem('aps_current_user');
    sessionStorage.removeItem('aps_current_user');
    setCurrentUser(null);
    setIsAuthOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        const isAdmin = email === 'tizsedoff@gmail.com';
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserAccount;
            const updated: UserAccount = {
              ...data,
              isAdmin,
              membership: isAdmin ? 'ADMINISTRADOR SUPREMO' : data.membership || 'APS INTELLIGENCE PRO',
            };
            setCurrentUser(updated);
            localStorage.setItem('aps_current_user', JSON.stringify(updated));
          } else {
            const inferredName = email.split('@')[0] || 'Usuario';
            const newUser: UserAccount = {
              id: firebaseUser.uid,
              name: inferredName.charAt(0).toUpperCase() + inferredName.slice(1),
              email,
              avatar: '',
              membership: isAdmin ? 'ADMINISTRADOR SUPREMO' : 'APS INTELLIGENCE PRO',
              isAdmin,
            };
            setCurrentUser(newUser);
            localStorage.setItem('aps_current_user', JSON.stringify(newUser));
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
          const newUser: UserAccount = {
            id: firebaseUser.uid,
            name: email.split('@')[0] || 'Usuario',
            email,
            avatar: '',
            membership: isAdmin ? 'ADMINISTRADOR SUPREMO' : 'APS INTELLIGENCE PRO',
            isAdmin,
          };
          setCurrentUser(newUser);
          localStorage.setItem('aps_current_user', JSON.stringify(newUser));
        }
        setIsAuthOpen(false);
      } else {
        const saved = localStorage.getItem('aps_current_user') || sessionStorage.getItem('aps_current_user');
        if (!saved) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Cookie Preferences State
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(() => {
    const saved = localStorage.getItem('aps_cookies');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      accepted: false,
      necessary: true,
      performance: true,
      personalization: true,
      timestamp: Date.now(),
    };
  });

  // 4. Extended Thinking setting
  const [extendedThinking, setExtendedThinking] = useState(true);

  // 5. Sessions management
  const [sessions, setSessions] = useState<{ id: string; title: string; timestamp: number }[]>(
    () => {
      const saved = localStorage.getItem('aps_sessions');
      return saved ? JSON.parse(saved) : [];
    }
  );
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return `session_${Date.now()}`;
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat for session
  useEffect(() => {
    const savedChat = localStorage.getItem(`aps_chat_${currentSessionId}`);
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Save chat to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`aps_chat_${currentSessionId}`, JSON.stringify(messages));
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === currentSessionId);
        const titleText = messages[0]?.content.slice(0, 36) || 'Idea APS';
        if (existing) {
          return prev.map((s) =>
            s.id === currentSessionId ? { ...s, title: titleText } : s
          );
        } else {
          const newSession = {
            id: currentSessionId,
            title: titleText,
            timestamp: Date.now(),
          };
          const updated = [newSession, ...prev];
          localStorage.setItem('aps_sessions', JSON.stringify(updated));
          return updated;
        }
      });
    }
  }, [messages, currentSessionId]);

  // Mouse move handler for specular reflection
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMousePos({ x, y });
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setActiveView('chat');
  };

  const handleDeleteSession = (id: string) => {
    localStorage.removeItem(`aps_chat_${id}`);
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    localStorage.setItem('aps_sessions', JSON.stringify(filtered));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === prev.length - 1 ? { ...m, isThinkingActive: false } : m
        )
      );
    }
  };

  // Send message with SSE streaming
  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    const modelMessageId = `model_${Date.now()}`;
    const initialModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      content: '',
      model: currentModel,
      mode: interactionMode,
      thinking: '',
      isThinkingActive: currentModel === 'APS HARD WORK' || extendedThinking,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, initialModelMessage]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = Date.now();

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((a) => ({
          data: a.data,
          mimeType: a.mimeType,
        })),
      }));

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          model: currentModel,
          mode: interactionMode,
          userName: currentUser?.name,
          prompt: text,
          messages: historyPayload,
          attachments: attachments.map((a) => ({
            data: a.data,
            mimeType: a.mimeType,
          })),
          extendedThinking: extendedThinking || currentModel === 'APS HARD WORK',
          terminalContext,
          userMemories: currentUser?.memories || [],
          customInstructions: currentUser?.customInstructions || '',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedModelText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          const subLines = line.split('\n');
          for (const subLine of subLines) {
            if (subLine.startsWith('event: ')) {
              eventType = subLine.substring(7).trim();
            } else if (subLine.startsWith('data: ')) {
              eventData = subLine.substring(6).trim();
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);

              if (eventType === 'thinking') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMessageId
                      ? {
                          ...m,
                          thinking: (m.thinking || '') + (parsed.chunk || ''),
                          isThinkingActive: true,
                        }
                      : m
                  )
                );
              } else if (eventType === 'token') {
                const chunk = parsed.chunk || '';
                accumulatedModelText += chunk;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMessageId
                      ? {
                          ...m,
                          content: (m.content || '') + chunk,
                          isThinkingActive: false,
                        }
                      : m
                  )
                );
              } else if (eventType === 'complete') {
                const duration = Date.now() - startTime;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMessageId
                      ? {
                          ...m,
                          isThinkingActive: false,
                          durationMs: duration,
                        }
                      : m
                  )
                );

                // Auto Memory Learning: If user is logged in, extract new facts from turn and store in memories
                if (currentUser && text.length > 5) {
                  try {
                    fetch('/api/memory/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userText: text,
                        modelReply: accumulatedModelText,
                        existingMemories: currentUser.memories || [],
                      }),
                    })
                      .then((r) => r.json())
                      .then(async (data) => {
                        if (data.success && Array.isArray(data.newMemories) && data.newMemories.length > 0) {
                          const existing = currentUser.memories || [];
                          // Filter duplicates
                          const uniqueNew = data.newMemories.filter(
                            (nm: MemoryItem) =>
                              !existing.some((em) => em.fact.toLowerCase() === nm.fact.toLowerCase())
                          );
                          if (uniqueNew.length > 0) {
                            const updatedMemories = [...uniqueNew, ...existing];
                            const updatedUser: UserAccount = {
                              ...currentUser,
                              memories: updatedMemories,
                            };
                            setCurrentUser(updatedUser);
                            localStorage.setItem('aps_current_user', JSON.stringify(updatedUser));
                            try {
                              const userRef = doc(db, 'users', currentUser.id);
                              await updateDoc(userRef, { memories: updatedMemories });
                            } catch (e) {
                              console.warn('Firestore auto-memory update note:', e);
                            }
                          }
                        }
                      })
                      .catch(() => {});
                  } catch {}
                }
              } else if (eventType === 'error') {
                let cleanMsg = parsed.message || 'Error temporal en los servidores de inferencia.';
                if (typeof cleanMsg === 'string' && (cleanMsg.includes('503') || cleanMsg.includes('high demand') || cleanMsg.includes('UNAVAILABLE'))) {
                  cleanMsg = 'El servidor de Google experimentó una sobrecarga temporal de alta demanda (503). Presiona el botón Reintentar.';
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === modelMessageId
                      ? {
                          ...m,
                          content: cleanMsg,
                          isThinkingActive: false,
                          error: true,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Non JSON line
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        let cleanMsg = err.message || 'Error al comunicarse con APS INTELLIGENCE.';
        if (cleanMsg.includes('503') || cleanMsg.includes('high demand') || cleanMsg.includes('UNAVAILABLE')) {
          cleanMsg = 'El servidor de Google experimentó una sobrecarga temporal de alta demanda (503). Presiona el botón Reintentar.';
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  content: cleanMsg,
                  isThinkingActive: false,
                  error: true,
                }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = (errorMsgId: string) => {
    const errIdx = messages.findIndex((m) => m.id === errorMsgId);
    if (errIdx >= 0) {
      const userMsg = messages[errIdx - 1];
      if (userMsg && userMsg.role === 'user') {
        setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
        handleSendMessage(userMsg.content, userMsg.attachments || []);
      }
    }
  };

  const handleSendToCli = (code: string, language: string) => {
    setCliInitialCode(code);
    setCliInitialLang(language);
    setCurrentModel('APS HARD WORK');
    setActiveView('cli');
  };

  // Determine root background styling
  const rootBgStyle: React.CSSProperties = {
    '--x': `${mousePos.x}%`,
    '--y': `${mousePos.y}%`,
    '--user-glass-blur': `${customization.glassBlur}px`,
    '--user-glass-opacity': customization.glassOpacity,
    '--user-glass-border': customization.glassBorderColor,
    backgroundColor: customization.bgType === 'color' ? customization.bgColor : '#000000',
    backgroundImage:
      customization.bgType === 'gradient'
        ? customization.bgGradient
        : customization.bgType === 'color'
        ? 'none'
        : 'none',
  } as React.CSSProperties;

  if (!currentUser) {
    return (
      <div className="relative min-h-screen w-screen overflow-x-hidden bg-[color:var(--surface-0)] text-[color:var(--text-primary)] font-sans">
        <AuthGateway
          onLogin={handleLogin}
          onOpenTerms={() => setIsTermsOpen(true)}
        />
        <LegalModals
          isTermsOpen={isTermsOpen}
          onCloseTerms={() => setIsTermsOpen(false)}
          cookiePrefs={cookiePrefs}
          onUpdateCookiePrefs={(p) => setCookiePrefs(p)}
        />
      </div>
    );
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      style={rootBgStyle}
      className="relative flex h-screen w-screen flex-col overflow-hidden text-[color:var(--text-primary)] transition-colors duration-300 font-sans"
    >
      {/* Background Image Layer if selected */}
      {customization.bgType === 'image' && customization.bgImage && (
        <div
          className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center transition-all duration-500"
          style={{
            backgroundImage: `url(${customization.bgImage})`,
            filter: `blur(${customization.bgImageBlur}px)`,
            opacity: customization.bgImageOpacity,
          }}
        />
      )}

      {/* Dynamic Specular Fluid Ambient Light */}
      {customization.glassSpecularGlow && (
        <div className="pointer-events-none fixed inset-0 refraction-glow -z-10" />
      )}

      {/* Header */}
      <Header
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
        interactionMode={interactionMode}
        onSelectInteractionMode={handleSelectMode}
        activeView={activeView}
        onSelectView={handleSelectView}
        customization={customization}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onNewChat={handleNewChat}
      />

      {/* Main Workspace Body */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Live background activity indicator when user is chatting while terminal works */}
        {activeView === 'chat' && terminalContext.isExecuting && (
          <div className="flex items-center justify-between border-b border-[color:var(--accent)]/30 bg-[color:var(--surface-1)]/90 px-3 sm:px-4 py-1.5 text-xs font-mono-code text-[color:var(--accent-soft)] backdrop-blur-md z-20">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
              <span>
                Terminal ejecutando en segundo plano:{' '}
                <strong className="text-[color:var(--accent)]">{terminalContext.lastCommand || 'Orden activa'}</strong>
              </span>
            </div>
            <button
              onClick={() => handleSelectView('cli')}
              className="rounded bg-[color:var(--accent)]/20 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--accent)]/40 transition-colors"
            >
              Ir a Terminal →
            </button>
          </div>
        )}

        {/* View 1: Chat View */}
        <div
          className={`flex flex-1 flex-col overflow-hidden ${
            activeView === 'chat' ? 'flex' : 'hidden'
          }`}
        >
          <ChatTimeline
            messages={messages}
            currentModel={currentModel}
            interactionMode={interactionMode}
            customization={customization}
            currentUser={currentUser}
            onSelectPrompt={(prompt) => handleSendMessage(prompt, [])}
            onSendToCli={handleSendToCli}
            onRetry={handleRetry}
            isLoading={isLoading}
          />

          <InputDock
            currentModel={currentModel}
            interactionMode={interactionMode}
            customization={customization}
            extendedThinking={extendedThinking}
            onToggleExtendedThinking={() => setExtendedThinking(!extendedThinking)}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onStopGeneration={handleStopGeneration}
          />
        </div>

        {/* View 2: CliConsole Component (STAYS MOUNTED IN BACKGROUND SO TERMINAL EXECUTION IS NEVER LOST) */}
        <div
          className={`flex flex-1 flex-col overflow-hidden ${
            activeView === 'cli' ? 'flex h-full w-full' : 'hidden'
          }`}
        >
          <CliConsole
            initialCode={cliInitialCode}
            initialLang={cliInitialLang}
            onStateUpdate={handleTerminalStateUpdate}
          />
        </div>
      </main>

      {/* Sidebar Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
      />

      {/* Customizer Studio Modal */}
      <CustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        customization={customization}
        onUpdateCustomization={handleUpdateCustomization}
        onReset={handleResetCustomization}
      />

      {/* Authentication & Profile Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        required={false}
      />

      {/* Legal & Cookie Modals */}
      <LegalModals
        isTermsOpen={isTermsOpen}
        onCloseTerms={() => setIsTermsOpen(false)}
        cookiePrefs={cookiePrefs}
        onUpdateCookiePrefs={(p) => setCookiePrefs(p)}
      />
    </div>
  );
}
