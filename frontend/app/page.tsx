"use client";

import { useState, useRef, useEffect } from "react";

/* ── Model registry (mirrors backend MODELS) ── */
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

interface Message {
  role:    "user" | "assistant";
  content: string;
}

const API_URL     = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MESSAGE_LIMIT = 10;

/* ══════════════════════════════════════════════ */
/*  Page                                          */
/* ══════════════════════════════════════════════ */
export default function Home() {
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [input,             setInput]             = useState("");
  const [loading,           setLoading]           = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [userId,            setUserId]            = useState<string | null>(null);
  const [uploadStatus,      setUploadStatus]      = useState<string | null>(null);
  const [messageCount,      setMessageCount]      = useState(0);
  const [selectedModel,     setSelectedModel]     = useState(MODELS[0].id);
  const [rateLimitedModels, setRateLimitedModels] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
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

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, message: text, model: selectedModel }),
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
          if (data.chunk && typeof data.chunk === "string") {
            applyChunk(data.chunk);
          } else if (data.error && typeof data.error === "string") {
            if (data.rate_limited) {
              setRateLimitedModels((prev) => new Set([...prev, selectedModel]));
            }
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
    }
  };

  /* ── Upload ── */
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload-file`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Upload failed"); }
      setUploadStatus(`"${file.name}" uploaded`);
    } catch (err: unknown) {
      setUploadStatus(`Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const remaining   = MESSAGE_LIMIT - messageCount;
  const isStreaming = loading && messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const currentModelInfo = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];

  return (
    <div className="flex flex-col h-screen bg-[#080810] text-white overflow-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-[100px]" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-violet-500/30">
              AI
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#080810]" />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-semibold text-white">AI Assistant</p>
            <p className="text-[11px] text-white/35">Always online</p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Model selector */}
          <ModelSelector
            models={MODELS}
            selected={selectedModel}
            rateLimited={rateLimitedModels}
            onSelect={setSelectedModel}
          />

          {/* Upload status badge */}
          {uploadStatus && (
            <span
              key={uploadStatus}
              className={`animate-fade-in hidden sm:inline-flex text-xs px-3 py-1.5 rounded-full border font-medium shrink-0 ${
                uploadStatus.startsWith("Error")
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}
            >
              {uploadStatus}
            </span>
          )}

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white/60 hover:text-white/90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            {uploading ? (
              <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/80 animate-spin-slow" />Uploading…</>
            ) : (
              <><UploadIcon />Upload File</>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.docx,.csv" className="hidden" onChange={uploadFile} />
        </div>
      </header>

      {/* Rate-limit banner */}
      {rateLimitedModels.has(selectedModel) && (
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs animate-fade-in shrink-0">
          <span>⚠️ <strong>{currentModelInfo.label}</strong> is currently unavailable (rate limit or quota exhausted).</span>
          <span className="text-amber-500/60 shrink-0">Select a different model →</span>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="relative flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState model={currentModelInfo} onHintClick={setInput} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-5 pb-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2.5 animate-message-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && <AIAvatar />}
                <div className={`relative max-w-[76%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md shadow-lg shadow-violet-500/20"
                    : "bg-white/[0.05] text-white/85 border border-white/[0.07] rounded-bl-md"
                }`}>
                  {msg.content}
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-[2px] h-[14px] bg-violet-400 ml-0.5 align-middle animate-cursor-blink" />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/40 shrink-0">
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-end gap-2.5 animate-message-in">
                <AIAvatar />
                <div className="px-4 py-3.5 bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-bl-md">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="relative z-10 px-4 py-4 border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shrink-0">
        <div className="max-w-3xl mx-auto">
          {messageCount >= MESSAGE_LIMIT ? (
            <div className="flex flex-col items-center gap-1.5 py-4 px-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center">
              <p className="text-sm font-semibold text-amber-400">Demo limit reached</p>
              <p className="text-xs text-amber-500/60">You've used all {MESSAGE_LIMIT} messages. Contact us for full access.</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2.5">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${currentModelInfo.label}…`}
                  rows={1}
                  className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm bg-white/[0.05] hover:bg-white/[0.07] focus:bg-white/[0.07] border border-white/[0.07] focus:border-violet-500/40 text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/15 overflow-y-auto transition-all duration-200"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 active:scale-90 shadow-lg shadow-violet-500/20 transition-all duration-150 disabled:opacity-25 disabled:pointer-events-none shrink-0"
                >
                  <SendIcon />
                </button>
              </div>
              <p className="text-[11px] text-white/20 text-right mt-2 select-none">
                {remaining} message{remaining !== 1 ? "s" : ""} left · Enter to send · Shift+Enter for new line
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════ */
/*  Model Selector                                */
/* ══════════════════════════════════════════════ */
function ModelSelector({
  models,
  selected,
  rateLimited,
  onSelect,
}: {
  models:      ModelInfo[];
  selected:    string;
  rateLimited: Set<string>;
  onSelect:    (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === selected) ?? models[0];
  const isCurrentLimited = rateLimited.has(selected);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-xl border transition-all duration-150 ${
          isCurrentLimited
            ? "border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/12"
            : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/65 hover:text-white/90"
        }`}
      >
        <ProviderDot provider={current.provider} />
        <span className="font-medium max-w-[110px] truncate">{current.label}</span>
        {isCurrentLimited && <span className="text-amber-400 shrink-0">⚠</span>}
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-white/[0.08] bg-[#111118]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50 animate-fade-in">
          <p className="px-3.5 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-white/25 font-semibold">Select model</p>
          <div className="p-1.5 space-y-0.5">
            {models.map((m) => {
              const limited   = rateLimited.has(m.id);
              const isActive  = m.id === selected;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (!limited) { onSelect(m.id); setOpen(false); } }}
                  disabled={limited}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-100 ${
                    isActive && !limited
                      ? "bg-violet-500/15 text-white"
                      : limited
                        ? "opacity-45 cursor-not-allowed text-white/50"
                        : "hover:bg-white/[0.05] text-white/65 hover:text-white"
                  }`}
                >
                  <ProviderDot provider={m.provider} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.label}</p>
                    <p className="text-[10px] text-white/30">{m.provider}</p>
                  </div>
                  {limited ? (
                    <span className="text-[10px] text-amber-400/80 font-semibold shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      Unavailable
                    </span>
                  ) : isActive ? (
                    <CheckMark />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="px-3.5 py-2.5 border-t border-white/[0.05]">
            <p className="text-[10px] text-white/20">Models marked Unavailable hit their rate limit or quota.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════ */
/*  Small sub-components                          */
/* ══════════════════════════════════════════════ */
function EmptyState({ model, onHintClick }: { model: ModelInfo; onHintClick: (v: string) => void }) {
  const hints = ["Summarize a document", "Explain a concept", "Analyze my data"];
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center select-none">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 opacity-25 blur-2xl scale-110 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-violet-500/30">
          AI
        </div>
      </div>
      <div>
        <p className="text-lg font-semibold text-white/90">How can I help you?</p>
        <p className="text-sm text-white/35 mt-1">
          Chatting with <span className="text-white/55 font-medium">{model.label}</span>
        </p>
        <p className="text-xs text-white/20 mt-0.5">PDF · DOCX · TXT · CSV · MD supported</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {hints.map((h) => (
          <button
            key={h}
            onClick={() => onHintClick(h)}
            className="px-3.5 py-1.5 text-xs text-white/45 border border-white/[0.08] rounded-full hover:border-violet-500/40 hover:text-white/75 hover:bg-violet-500/5 active:scale-95 transition-all duration-150"
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-md shadow-violet-500/25">
      AI
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center h-4">
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-violet-400/60"
          style={{ animation: `wave 1.3s ease-in-out ${delay}ms infinite` }}
        />
      ))}
    </div>
  );
}

function ProviderDot({ provider }: { provider: ModelInfo["provider"] }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 ${
        provider === "Google" ? "bg-violet-400" : "bg-orange-400"
      }`}
    />
  );
}

function CheckMark() {
  return (
    <svg className="w-3.5 h-3.5 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}
