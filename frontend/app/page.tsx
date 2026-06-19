"use client";

import { useState, useRef, useEffect } from "react";
import MarkdownMessage from "./components/MarkdownMessage";

/* ── Model registry ── */
interface ModelInfo {
  id:       string;
  label:    string;
  provider: "Google" | "Groq";
}

const MODELS: ModelInfo[] = [
  { id: "gemini-2.5-flash",        label: "Gemini 2.5 Flash", provider: "Google" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",   provider: "Groq"   },
  { id: "llama3-8b-8192",          label: "Llama 3 8B",       provider: "Groq"   },
];

interface Source     { title: string; url: string; content: string; }
interface Message    { role: "user" | "assistant"; content: string; sources?: Source[]; }
interface HistoryMsg { role: "user" | "assistant"; message: string; created_at: string; }

const API_URL       = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MESSAGE_LIMIT = 10;

/* ══════════════════════════════════════════════════════════ */
export default function Home() {
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [input,             setInput]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [isSearching,       setIsSearching]       = useState(false);
  const [userId,            setUserId]            = useState<string | null>(null);
  const [messageCount,      setMessageCount]      = useState(0);
  const [selectedModel,     setSelectedModel]     = useState(MODELS[0].id);
  const [rateLimitedModels, setRateLimitedModels] = useState<Set<string>>(new Set());
  const [webSearchEnabled,  setWebSearchEnabled]  = useState(false);
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [historyItems,      setHistoryItems]      = useState<HistoryMsg[]>([]);
  const [historyLoading,    setHistoryLoading]    = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("chat_user_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("chat_user_id", id); }
    setUserId(id);
    setMessageCount(parseInt(localStorage.getItem("chat_message_count") || "0", 10));
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

  /* ── Fetch history when sidebar opens ── */
  useEffect(() => {
    if (!sidebarOpen || !userId) return;
    setHistoryLoading(true);
    fetch(`${API_URL}/history?user_id=${encodeURIComponent(userId)}&limit=100`)
      .then((r) => r.json())
      .then((d) => setHistoryItems(d.history ?? []))
      .catch(() => setHistoryItems([]))
      .finally(() => setHistoryLoading(false));
  }, [sidebarOpen, userId]);

  /* ── Video background watchdog ── */
  useEffect(() => {
    const video = document.getElementById("bg-video") as HTMLVideoElement | null;
    if (!video) return;
    video.loop = true;
    video.muted = true;
    const tryPlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    tryPlay();
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("stalled", tryPlay);
    const onVis = () => { if (!document.hidden) tryPlay(); };
    document.addEventListener("visibilitychange", onVis);
    let last = -1, stuck = 0;
    const watchdog = setInterval(() => {
      if (!video || document.hidden) { last = -1; return; }
      const t = video.currentTime;
      if (video.paused) { tryPlay(); return; }
      if (t === last) {
        stuck++;
        if (stuck >= 2) {
          try { video.currentTime = (t > 0.1 && t < video.duration - 0.3) ? t : 0; } catch (_) {}
          tryPlay(); stuck = 0;
        }
      } else { stuck = 0; }
      last = t;
    }, 1000);
    return () => {
      clearInterval(watchdog);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  /* ── Send ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || messageCount >= MESSAGE_LIMIT) return;

    const newCount = messageCount + 1;
    setMessageCount(newCount);
    localStorage.setItem("chat_message_count", String(newCount));
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setIsSearching(false);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, message: text, model: selectedModel, web_search: webSearchEnabled }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantAdded = false;

      const applyChunk = (chunk: string) => {
        setIsSearching(false);
        if (!assistantAdded) {
          setMessages((prev) => [...prev, { role: "assistant", content: chunk }]);
          assistantAdded = true;
        } else {
          setMessages((prev) => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + chunk };
            return msgs;
          });
        }
      };

      const parseLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const data = JSON.parse(line);
          if (data.searching) {
            setIsSearching(true);
          } else if (data.chunk && typeof data.chunk === "string") {
            applyChunk(data.chunk);
          } else if (data.sources && Array.isArray(data.sources)) {
            setMessages((prev) => {
              const msgs = [...prev];
              const last = msgs[msgs.length - 1];
              if (last?.role === "assistant") msgs[msgs.length - 1] = { ...last, sources: data.sources };
              return msgs;
            });
          } else if (data.error && typeof data.error === "string") {
            if (data.rate_limited) setRateLimitedModels((prev) => { const s = new Set(prev); s.add(selectedModel); return s; });
            applyChunk(data.rate_limited ? `⚠️ ${data.error}` : `Error: ${data.error}`);
          }
        } catch (_) {}
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(parseLine);
        }
      } catch (_) {
        // stream cut short
      } finally {
        reader.releaseLock();
      }
      parseLine(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const remaining        = MESSAGE_LIMIT - messageCount;
  const isStreaming      = loading && messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const currentModel     = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];
  const isCurrentLimited = rateLimitedModels.has(selectedModel);
  const showWelcome      = messages.length === 0 && !loading;

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setMessageCount(0);
    localStorage.setItem("chat_message_count", "0");
    setLoading(false);
    setIsSearching(false);
  };

  return (
    <div
      className="flex h-dvh overflow-hidden"
      style={{
        position:   "relative",
        background: "radial-gradient(ellipse 120% 85% at 50% 100%, #0d1628 0%, #060912 60%)",
        color:      "#e8ecf8",
        fontFamily: "'Anybody', system-ui, sans-serif",
      }}
    >
      {/* ── Animated video background (full-page, behind everything) ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <video
          id="bg-video"
          src="/bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            position:  "absolute",
            inset:     0,
            width:     "100%",
            height:    "100%",
            objectFit: "cover",
            transform: "scale(1.04)",
            filter:    "saturate(1.12)",
            opacity:   0.9,
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 34% 58% at 50% 50%, rgba(6,9,18,0.94) 0%, rgba(6,9,18,0.7) 45%, rgba(6,9,18,0) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 62% 106% at 50% 45%, rgba(6,9,18,0.25) 0%, rgba(6,9,18,0) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,9,18,0.4) 0%, transparent 22%, transparent 72%, rgba(6,9,18,0.72) 100%)" }} />
      </div>

      {/* ── History Sidebar ── */}
      <HistorySidebar
        open={sidebarOpen}
        items={historyItems}
        loading={historyLoading}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
      />

      {/* ── Main column ── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

      {/* ── Header ── */}
      <header
        className="relative z-20 flex-none border-b"
        style={{
          background:     "rgba(9,13,24,0.72)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderColor:    "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between header-inner" style={{ maxWidth: "100%" }}>
          {/* Sidebar toggle + Logo + name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Close history" : "Open chat history"}
              style={{
                width:        36,
                height:       36,
                flex:         "none",
                border:       "none",
                borderRadius: 10,
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                background:   sidebarOpen ? "rgba(59,130,246,0.15)" : "transparent",
                color:        sidebarOpen ? "#7eb0ff" : "rgba(232,236,248,0.5)",
                transition:   "background .15s, color .15s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2.5" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
            <span style={{ flex: "none", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo.png" alt="AI Med-pedia logo" width={30} height={30} style={{ width: 30, height: 30, objectFit: "contain", display: "block" }} />
            </span>
            <span
              style={{ fontFamily: "'Geist', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: "#f2f4ff" }}
            >
              AI Med-pedia
            </span>
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "#3b82f6", animation: "lum-pulse 2.4s infinite" }}
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <ModelSelector
              models={MODELS}
              selected={selectedModel}
              rateLimited={rateLimitedModels}
              onSelect={setSelectedModel}
            />

            <button
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ background: "transparent", border: "none", color: "#6fa8ff", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="12" cy="5"  r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Rate-limit banner */}
      {isCurrentLimited && (
        <div
          className="relative z-10 flex items-center justify-between gap-3 px-6 py-2.5 text-xs animate-fade-in shrink-0"
          style={{ background: "rgba(217,119,6,0.1)", borderBottom: "1px solid rgba(217,119,6,0.2)", color: "#fbbf24" }}
        >
          <span>⚠️ <strong>{currentModel.label}</strong> is currently unavailable (rate limit).</span>
          <span style={{ color: "rgba(251,191,36,0.5)" }} className="shrink-0">Select a different model →</span>
        </div>
      )}

      {/* ── Messages scroll area ── */}
      <main
        className="relative z-10 flex-1 overflow-y-auto"
        style={{ padding: "32px 16px 180px" }}
      >
        <div className="mx-auto flex flex-col" style={{ maxWidth: 800 }}>

          {/* Welcome state */}
          {showWelcome && (
            <div className="flex flex-col items-center text-center" style={{ paddingTop: "clamp(32px, 8vh, 64px)" }}>
              <div style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/logo.png" alt="AI Med-pedia logo" width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain", display: "block" }} />
              </div>
              <h1
                className="welcome-heading"
                style={{
                  margin:           "24px 0 0",
                  fontFamily:       "'Geist', sans-serif",
                  fontWeight:       600,
                  letterSpacing:    "-0.02em",
                  lineHeight:       1.15,
                  background:       "linear-gradient(95deg,#ffffff 25%,#5b9bff)",
                  WebkitBackgroundClip: "text",
                  backgroundClip:   "text",
                  color:            "transparent",
                }}
              >
                Your AI Medical Information Assistant
              </h1>
              <p style={{ margin: "14px 0 0", maxWidth: 480, fontSize: 16, lineHeight: 1.6, color: "#aab4c9" }}>
                Ask me about symptoms, medications, nutrition, or general health guidance. Always consult a qualified doctor for personal medical advice.
              </p>

              {/* Quick-start medical questions */}
              <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 680 }}>
                {QUICK_QUESTIONS.map((q) => (
                  <QuickQuestionPill
                    key={q}
                    question={q}
                    onClick={() => { setInput(q); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  />
                ))}
              </div>

              {/* Model / web-search hint */}
              <p style={{ marginTop: 32, fontSize: 12, color: "rgba(232,236,248,0.35)", fontFamily: "'Geist',sans-serif" }}>
                Chatting with <span style={{ color: "#7eb0ff" }}>{currentModel.label}</span>
                {webSearchEnabled && <span style={{ color: "#fb923c", marginLeft: 8 }}>· web search on</span>}
              </p>
            </div>
          )}

          {/* Conversation */}
          <div className="flex flex-col" style={{ gap: 22 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className="animate-message-in"
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 12, alignItems: "flex-start" }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      flex:         "none",
                      width:        38,
                      height:       38,
                      borderRadius: 11,
                      background:   "linear-gradient(160deg,#1b2742,#101a30)",
                      border:       "1px solid rgba(96,165,250,0.28)",
                      boxShadow:    "0 6px 18px rgba(0,0,0,0.4)",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                      marginTop:    2,
                    }}
                  >
                    <img src="/logo.png" alt="AI Med-pedia logo" width={24} height={24} style={{ width: 24, height: 24, objectFit: "contain", display: "block" }} />
                  </div>
                )}

                <div className={msg.role === "user" ? "bubble-user" : "bubble-ai"}>
                  <div
                    style={
                      msg.role === "user"
                        ? {
                            padding:      "14px 18px",
                            borderRadius: "14px 14px 4px 14px",
                            background:   "#1c2740",
                            border:       "1px solid rgba(255,255,255,0.08)",
                            boxShadow:    "0 2px 8px rgba(0,0,0,0.3)",
                            fontSize:     16,
                            lineHeight:   1.55,
                            color:        "#eef1fb",
                            whiteSpace:   "pre-wrap",
                          }
                        : {
                            padding:      "20px 24px",
                            borderRadius: "14px 14px 14px 4px",
                            background:   "#101a30",
                            border:       "1px solid rgba(96,165,250,0.2)",
                            boxShadow:    "0 4px 18px rgba(0,0,0,0.35)",
                          }
                    }
                  >
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <>
                        <MarkdownMessage
                          content={msg.content}
                          streaming={isStreaming && i === messages.length - 1}
                        />
                        {/* Action row */}
                        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                          <ActionBtn title="Copy" onClick={() => navigator.clipboard.writeText(msg.content)}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="12" height="12" rx="2.5" />
                              <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
                            </svg>
                          </ActionBtn>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sources */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="animate-fade-in" style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 10, color: "rgba(232,236,248,0.3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Geist',sans-serif" }}>
                        Sources
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {msg.sources.map((s, si) => (
                          <a
                            key={si}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display:        "inline-flex",
                              alignItems:     "center",
                              gap:            6,
                              padding:        "4px 10px",
                              borderRadius:   8,
                              background:     "rgba(91,155,255,0.07)",
                              border:         "1px solid rgba(91,155,255,0.15)",
                              color:          "rgba(232,236,248,0.5)",
                              fontSize:       10,
                              maxWidth:       200,
                              textDecoration: "none",
                              fontFamily:     "'Geist',sans-serif",
                            }}
                          >
                            <span style={{ color: "#6fa8ff", fontWeight: 700 }}>[{si + 1}]</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || s.url}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking / searching indicator */}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="animate-message-in" style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    flex:         "none",
                    width:        38,
                    height:       38,
                    borderRadius: 11,
                    background:   "linear-gradient(160deg,#1b2742,#101a30)",
                    border:       "1px solid rgba(96,165,250,0.28)",
                    display:      "flex",
                    alignItems:   "center",
                    justifyContent: "center",
                  }}
                >
                  <img src="/logo.png" alt="AI Med-pedia logo" width={22} height={22} style={{ width: 22, height: 22, objectFit: "contain", display: "block" }} />
                </div>

                {isSearching ? (
                  <div
                    style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          10,
                      padding:      "14px 18px",
                      borderRadius: "14px 14px 14px 4px",
                      background:   "#101a30",
                      border:       "1px solid rgba(96,165,250,0.2)",
                    }}
                  >
                    <span className="relative flex shrink-0">
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75" style={{ background: "#fb923c" }} />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#fb923c" }} />
                    </span>
                    <span style={{ fontSize: 14, color: "rgba(232,236,248,0.5)" }}>Searching the web…</span>
                  </div>
                ) : (
                  <LavaLoader />
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* ── Floating input ── */}
      <div
        className="absolute bottom-0 left-0 w-full z-30 safe-bottom"
        style={{ paddingTop: 64, paddingLeft: 16, paddingRight: 16, background: "linear-gradient(to top,#060912 38%,rgba(6,9,18,0.85) 70%,transparent)", pointerEvents: "none" }}
      >
        <div className="mx-auto" style={{ maxWidth: 800, pointerEvents: "auto" }}>
          {messageCount >= MESSAGE_LIMIT ? (
            <div
              style={{
                padding:     "16px 20px",
                borderRadius: 16,
                border:      "1px solid rgba(217,119,6,0.2)",
                background:  "rgba(217,119,6,0.05)",
                textAlign:   "center",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fbbf24", fontFamily: "'Geist',sans-serif", margin: 0 }}>Demo limit reached</p>
              <p style={{ fontSize: 12, color: "rgba(251,191,36,0.55)", marginTop: 4, marginBottom: 0 }}>
                You&apos;ve used all {MESSAGE_LIMIT} messages. Contact us for full access.
              </p>
            </div>
          ) : (
            <>
              {/* Input pill with glow */}
              <div style={{ position: "relative", borderRadius: 9999 }}>
                <div className="lum-ringglow" aria-hidden />
                <div className="lum-ring" aria-hidden />
                <div
                  style={{
                    position:       "relative",
                    zIndex:         1,
                    display:        "flex",
                    alignItems:     "flex-end",
                    gap:            6,
                    padding:        8,
                    borderRadius:   9999,
                    background:     "rgba(20,27,44,0.82)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border:         "1px solid rgba(255,255,255,0.06)",
                    boxShadow:      "0 10px 34px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Attach / web-search toggle */}
                  <button
                    onClick={() => setWebSearchEnabled((v) => !v)}
                    title={webSearchEnabled ? "Web search on — click to disable" : "Enable web search"}
                    style={{
                      width:        42,
                      height:       42,
                      flex:         "none",
                      border:       "none",
                      borderRadius: 9999,
                      cursor:       "pointer",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                      transition:   "background .15s",
                      background:   webSearchEnabled ? "rgba(251,146,60,0.15)" : "transparent",
                      color:        webSearchEnabled ? "#fb923c" : "#aab4c9",
                    }}
                  >
                    <GlobeIcon />
                  </button>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={webSearchEnabled ? "Ask anything — web search is on…" : "Type your message…"}
                    rows={1}
                    style={{
                      flex:       1,
                      minWidth:   0,
                      border:     "none",
                      outline:    "none",
                      background: "transparent",
                      resize:     "none",
                      minHeight:  44,
                      maxHeight:  128,
                      padding:    "11px 6px 11px",
                      fontFamily: "'Anybody', sans-serif",
                      fontSize:   16,
                      color:      "#eef1fb",
                      lineHeight: 1.4,
                      overflow:   "auto",
                    }}
                    className="placeholder:text-[rgba(232,236,248,0.3)]"
                  />

                  {/* Send / Stop */}
                  {loading ? (
                    <button
                      onClick={() => { setLoading(false); setIsSearching(false); }}
                      style={{
                        width:        42,
                        height:       42,
                        flex:         "none",
                        border:       "none",
                        borderRadius: 9999,
                        cursor:       "pointer",
                        display:      "flex",
                        alignItems:   "center",
                        justifyContent: "center",
                        background:   "rgba(248,113,113,0.16)",
                        color:        "#f87171",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2.5" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      style={{
                        width:        42,
                        height:       42,
                        flex:         "none",
                        border:       "none",
                        borderRadius: 9999,
                        cursor:       input.trim() ? "pointer" : "not-allowed",
                        display:      "flex",
                        alignItems:   "center",
                        justifyContent: "center",
                        background:   "#3b82f6",
                        color:        "#ffffff",
                        boxShadow:    "0 2px 12px rgba(59,130,246,0.5)",
                        opacity:      input.trim() ? 1 : 0.4,
                        transition:   "filter .2s ease, opacity .2s ease",
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="20" x2="12" y2="6" />
                        <polyline points="6 12 12 6 18 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Hint row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {webSearchEnabled && (
                    <span
                      className="animate-fade-in"
                      style={{
                        display:      "inline-flex",
                        alignItems:   "center",
                        gap:          4,
                        fontSize:     10,
                        color:        "rgba(251,146,60,0.75)",
                        background:   "rgba(251,146,60,0.08)",
                        border:       "1px solid rgba(251,146,60,0.15)",
                        padding:      "2px 8px",
                        borderRadius: 9999,
                        fontFamily:   "'Geist',sans-serif",
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#fb923c" }} />
                      Web search on
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize:   11,
                    color:      "rgba(232,236,248,0.25)",
                    fontFamily: "'Geist',sans-serif",
                    margin:     0,
                  }}
                >
                  {remaining} message{remaining !== 1 ? "s" : ""} left · Enter to send
                </p>
              </div>
            </>
          )}

          <p
            style={{
              margin:     "6px 0 0",
              textAlign:  "center",
              fontFamily: "'Geist',sans-serif",
              fontSize:   11,
              letterSpacing: "0.04em",
              color:      "rgba(232,236,248,0.3)",
            }}
          >
            AI Med-pedia provides general health information only. Always consult a qualified healthcare professional for medical advice.
          </p>
        </div>
      </div>
      </div> {/* end main column */}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Model Selector                                            */
/* ══════════════════════════════════════════════════════════ */
function ModelSelector({ models, selected, rateLimited, onSelect }: {
  models:      ModelInfo[];
  selected:    string;
  rateLimited: Set<string>;
  onSelect:    (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref     = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === selected) ?? models[0];
  const limited = rateLimited.has(selected);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }} className="shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display:     "flex",
          alignItems:  "center",
          gap:         8,
          padding:     "7px 12px",
          fontSize:    12,
          borderRadius: 12,
          border:      limited ? "1px solid rgba(217,119,6,0.3)" : "1px solid rgba(255,255,255,0.08)",
          background:  limited ? "rgba(217,119,6,0.08)" : "rgba(255,255,255,0.04)",
          color:       limited ? "#fbbf24" : "rgba(232,236,248,0.65)",
          cursor:      "pointer",
          fontFamily:  "'Geist',sans-serif",
          fontWeight:  500,
          transition:  "background .15s",
        }}
      >
        <ProviderDot provider={current.provider} />
        <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.label}</span>
        {limited && <span style={{ color: "#fbbf24" }}>⚠</span>}
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          className="animate-fade-in"
          style={{
            position:       "absolute",
            right:          0,
            top:            "calc(100% + 8px)",
            width:          240,
            borderRadius:   16,
            border:         "1px solid rgba(255,255,255,0.08)",
            background:     "rgba(9,14,26,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow:      "0 16px 40px rgba(0,0,0,0.6)",
            overflow:       "hidden",
            zIndex:         50,
          }}
        >
          <p
            style={{
              padding:       "12px 14px 6px",
              fontSize:      10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color:         "rgba(232,236,248,0.25)",
              fontFamily:    "'Geist',sans-serif",
              fontWeight:    600,
              margin:        0,
            }}
          >
            Select model
          </p>
          <div style={{ padding: "0 6px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
            {models.map((m) => {
              const isLimited = rateLimited.has(m.id);
              const isActive  = m.id === selected;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (!isLimited) { onSelect(m.id); setOpen(false); } }}
                  disabled={isLimited}
                  style={{
                    width:        "100%",
                    display:      "flex",
                    alignItems:   "center",
                    gap:          12,
                    padding:      "10px 10px",
                    borderRadius: 10,
                    textAlign:    "left",
                    border:       "none",
                    cursor:       isLimited ? "not-allowed" : "pointer",
                    background:   isActive && !isLimited ? "rgba(59,130,246,0.15)" : "transparent",
                    color:        isLimited ? "rgba(232,236,248,0.4)" : isActive ? "#eef1fb" : "rgba(232,236,248,0.65)",
                    opacity:      isLimited ? 0.5 : 1,
                    transition:   "background .1s",
                    fontFamily:   "'Geist',sans-serif",
                  }}
                >
                  <ProviderDot provider={m.provider} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{m.label}</p>
                    <p style={{ fontSize: 10, color: "rgba(232,236,248,0.3)", margin: 0 }}>{m.provider}</p>
                  </div>
                  {isLimited
                    ? <span style={{ fontSize: 10, color: "rgba(251,191,36,0.8)", background: "rgba(217,119,6,0.1)", padding: "2px 6px", borderRadius: 9999 }}>Unavailable</span>
                    : isActive
                    ? <svg className="w-3.5 h-3.5" style={{ color: "#5b9bff", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : null}
                </button>
              );
            })}
          </div>
          <div
            style={{
              padding:      "8px 14px 10px",
              borderTop:    "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p style={{ fontSize: 10, color: "rgba(232,236,248,0.2)", margin: 0, fontFamily: "'Geist',sans-serif" }}>
              Models marked Unavailable hit their rate limit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Medical Quick-Start Questions                             */
/* ══════════════════════════════════════════════════════════ */
const QUICK_QUESTIONS = [
  "What are the warning signs of a heart attack?",
  "What are the symptoms of a stroke?",
  "When should a high fever be considered an emergency?",
  "How can I lower my cholesterol naturally?",
  "What foods should I avoid with high blood pressure?",
  "How much exercise is recommended for heart health?",
  "What are the side effects of steroids?",
  "How do antihistamines work?",
  "What is the difference between ibuprofen and acetaminophen?",
];

function QuickQuestionPill({ question, onClick }: { question: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor:         "pointer",
        padding:        "9px 16px",
        borderRadius:   9999,
        background:     hovered ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border:         hovered ? "1px solid rgba(96,165,250,0.45)" : "1px solid rgba(255,255,255,0.09)",
        boxShadow:      hovered ? "0 4px 14px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.2)",
        transform:      hovered ? "translateY(-2px)" : "translateY(0)",
        transition:     "transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease",
        fontFamily:     "'Geist',sans-serif",
        fontSize:       13,
        color:          hovered ? "#c8d8f8" : "#9aa4ba",
        whiteSpace:     "nowrap",
        display:        "flex",
        alignItems:     "center",
        gap:            7,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hovered ? "#7eb0ff" : "#5b7a99"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
      </svg>
      {question}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Lava Loader (thinking state)                              */
/* ══════════════════════════════════════════════════════════ */
function LavaLoader() {
  return (
    <div
      className="lum-loader"
      role="status"
      aria-label="Thinking"
    >
      <div className="lum-box" />
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <mask id="lum-clip">
          <polygon points="50,14 76,54 34,60" />
          <polygon points="30,34 70,30 55,66" />
          <polygon points="36,30 66,46 44,68" />
          <polygon points="28,48 60,32 58,66" />
          <polygon points="40,28 68,42 38,62" />
          <polygon points="42,30 70,50 45,64" />
          <polygon points="38,40 66,38 52,66" />
        </mask>
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  Small reusable components                                 */
/* ══════════════════════════════════════════════════════════ */
function AILogoMark({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   size * 0.3,
        background:     "linear-gradient(135deg, #1e3a6e 0%, #0d1f42 50%, #3b82f6 100%)",
        border:         "1px solid rgba(96,165,250,0.35)",
        boxShadow:      "0 4px 14px rgba(59,130,246,0.25)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="#7eb0ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V6a4 4 0 0 1 4-4z" />
        <circle cx="9"  cy="10" r="1" fill="#7eb0ff" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="#7eb0ff" stroke="none" />
      </svg>
    </div>
  );
}

function ActionBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:          30,
        height:         30,
        border:         "none",
        background:     hov ? "rgba(255,255,255,0.08)" : "transparent",
        borderRadius:   8,
        cursor:         "pointer",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          hov ? "#7eb0ff" : "rgba(232,236,248,0.4)",
        transition:     "background .15s, color .15s",
      }}
    >
      {children}
    </button>
  );
}

function ProviderDot({ provider }: { provider: ModelInfo["provider"] }) {
  return (
    <span
      style={{
        width:        8,
        height:       8,
        borderRadius: "50%",
        flexShrink:   0,
        background:   provider === "Google" ? "#5b9bff" : "#fb923c",
        display:      "inline-block",
      }}
    />
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      style={{ width: 12, height: 12, flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c-2.5 0-4-4-4-9s1.5-9 4-9m0 18c2.5 0 4-4 4-9s-1.5-9-4-9M3.05 9h17.9M3.05 15h17.9" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  History Sidebar — Glass Design                            */
/* ══════════════════════════════════════════════════════════ */
function HistorySidebar({
  open, items, loading, onClose, onNewChat,
}: {
  open:       boolean;
  items:      HistoryMsg[];
  loading:    boolean;
  onClose:    () => void;
  onNewChat:  () => void;
}) {
  /* Group flat list into Q&A pairs */
  const pairs: { user: HistoryMsg; assistant?: HistoryMsg }[] = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].role === "user") {
      const next = items[i + 1];
      pairs.push({ user: items[i], assistant: next?.role === "assistant" ? next : undefined });
      if (next?.role === "assistant") i++;
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>

      <div
        style={{
          width:              open ? 272 : 0,
          minWidth:           open ? 272 : 0,
          overflow:           "hidden",
          transition:         "width .3s cubic-bezier(.4,0,.2,1), min-width .3s cubic-bezier(.4,0,.2,1)",
          display:            "flex",
          flexDirection:      "column",
          position:           "relative",
          zIndex:             40,
          flexShrink:         0,
          /* glass effect */
          background:         "rgba(8,14,32,0.52)",
          backdropFilter:     "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
          borderRight:        open ? "1px solid rgba(255,255,255,0.09)" : "none",
          boxShadow:          open ? "inset -1px 0 0 rgba(96,165,250,0.06), 4px 0 24px rgba(0,0,0,0.35)" : "none",
        }}
      >
        {/* Top accent line */}
        {open && (
          <div style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     1,
            background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent)",
            zIndex:     1,
          }} />
        )}

        {/* ── Sidebar header ── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "18px 14px 14px",
            borderBottom:   "1px solid rgba(255,255,255,0.06)",
            flexShrink:     0,
            background:     "rgba(255,255,255,0.015)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7,
              background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(96,165,250,0.1))",
              border: "1px solid rgba(96,165,250,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7eb0ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Geist',sans-serif", fontSize: 13, fontWeight: 600, color: "#d4e2ff", letterSpacing: "0.01em" }}>
              Chat History
            </span>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              border: "none", borderRadius: 7, cursor: "pointer", lineHeight: 0,
              padding: 5, background: "rgba(255,255,255,0.04)", color: "rgba(232,236,248,0.4)",
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLElement).style.color = "rgba(232,236,248,0.8)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "rgba(232,236,248,0.4)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── New Chat button ── */}
        <div style={{ padding: "12px 10px 8px", flexShrink: 0 }}>
          <button
            onClick={onNewChat}
            style={{
              width:          "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            8,
              padding:        "10px 14px",
              borderRadius:   12,
              border:         "1px solid rgba(96,165,250,0.28)",
              background:     "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(96,165,250,0.08) 100%)",
              backdropFilter: "blur(8px)",
              cursor:         "pointer",
              fontFamily:     "'Geist',sans-serif",
              fontSize:       13,
              fontWeight:     600,
              color:          "#93c5fd",
              letterSpacing:  "0.01em",
              transition:     "background .2s, border-color .2s, box-shadow .2s, transform .15s",
              boxShadow:      "0 2px 12px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "linear-gradient(135deg, rgba(59,130,246,0.28) 0%, rgba(96,165,250,0.14) 100%)";
              el.style.borderColor = "rgba(96,165,250,0.5)";
              el.style.boxShadow = "0 4px 18px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(96,165,250,0.08) 100%)";
              el.style.borderColor = "rgba(96,165,250,0.28)";
              el.style.boxShadow = "0 2px 12px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.06)";
              el.style.transform = "translateY(0)";
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Chat
          </button>
        </div>

        {/* ── Divider ── */}
        <div style={{ margin: "0 10px 2px", height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* ── Scrollable history list ── */}
        <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "8px 10px 16px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 36 }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                border: "2px solid rgba(96,165,250,0.15)",
                borderTopColor: "#5b9bff",
                display: "inline-block",
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          )}

          {!loading && pairs.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 44 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, margin: "0 auto 12px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(232,236,248,0.2)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(232,236,248,0.22)", fontFamily: "'Geist',sans-serif" }}>No history yet</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "rgba(232,236,248,0.14)", fontFamily: "'Geist',sans-serif" }}>Start a conversation to see it here</p>
            </div>
          )}

          {!loading && pairs.length > 0 && (
            <>
              <p style={{ margin: "0 0 8px 2px", fontSize: 10, fontFamily: "'Geist',sans-serif", color: "rgba(232,236,248,0.25)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Recent · {pairs.length} exchange{pairs.length !== 1 ? "s" : ""}
              </p>
              {pairs.map((pair, idx) => (
                <HistoryPairCard key={idx} pair={pair} />
              ))}
            </>
          )}
        </div>

        {/* ── Bottom glow accent ── */}
        {open && (
          <div style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     60,
            background: "linear-gradient(to top, rgba(6,14,32,0.6), transparent)",
            pointerEvents: "none",
          }} />
        )}
      </div>
    </>
  );
}

function HistoryPairCard({ pair }: { pair: { user: HistoryMsg; assistant?: HistoryMsg } }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const date      = new Date(pair.user.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const truncate  = (text: string, max: number) => text.length > max ? text.slice(0, max).trimEnd() + "…" : text;

  return (
    <div
      style={{
        marginBottom:   5,
        borderRadius:   11,
        border:         `1px solid ${expanded ? "rgba(96,165,250,0.22)" : hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
        background:     expanded
          ? "rgba(59,130,246,0.07)"
          : hovered
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.02)",
        backdropFilter: "blur(8px)",
        overflow:       "hidden",
        transition:     "background .2s, border-color .2s, box-shadow .2s",
        boxShadow:      expanded ? "0 4px 16px rgba(59,130,246,0.1)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", cursor: "pointer", padding: "10px 12px 9px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: "'Geist',sans-serif", fontSize: 10, color: "rgba(232,236,248,0.3)",
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {dateLabel} · {timeLabel}
          </span>
          <svg
            width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke={expanded ? "rgba(96,165,250,0.7)" : "rgba(232,236,248,0.25)"}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform .22s, stroke .2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <p style={{ margin: 0, fontFamily: "'Geist',sans-serif", fontSize: 12, color: expanded ? "#c8d8f8" : "#9dafc8", lineHeight: 1.45, transition: "color .2s" }}>
          {truncate(pair.user.message, 90)}
        </p>
      </button>

      {expanded && pair.assistant && (
        <div style={{
          borderTop:      "1px solid rgba(96,165,250,0.1)",
          padding:        "9px 12px 11px",
          background:     "rgba(6,14,32,0.3)",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src="/logo.png" alt="" width={10} height={10} style={{ width: 10, height: 10, objectFit: "contain" }} />
            </div>
            <span style={{ fontFamily: "'Geist',sans-serif", fontSize: 9, color: "rgba(96,165,250,0.5)", textTransform: "uppercase", letterSpacing: "0.07em" }}>AI Med-pedia</span>
          </div>
          <p style={{ margin: 0, fontFamily: "'Geist',sans-serif", fontSize: 11, color: "rgba(196,212,240,0.55)", lineHeight: 1.55 }}>
            {truncate(pair.assistant.message, 200)}
          </p>
        </div>
      )}
    </div>
  );
}

