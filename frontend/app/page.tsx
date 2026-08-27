"use client";

import { useEffect, useRef, useState } from "react";
import { color } from "./theme";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import HomeView from "./components/HomeView";
import ThreadView from "./components/ThreadView";
import SourceDrawer from "./components/SourceDrawer";
import FloatingInput from "./components/FloatingInput";
import type { ChatMessage, ConversationSummary, ModelInfo, Source, RawHistoryMessage } from "./types";

const MODELS: ModelInfo[] = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",    provider: "Groq" },
  { id: "gemini-2.5-flash",        label: "Gemini 2.5 Flash", provider: "Google" },
];

const API_URL      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MESSAGE_LIMIT = 10;

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const [view, setView] = useState<"home" | "thread">("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [rateLimitedModels, setRateLimitedModels] = useState<Set<string>>(new Set());

  const [sourcesOn, setSourcesOn] = useState(true);
  const [plain, setPlain] = useState(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [drawerSource, setDrawerSource] = useState<Source | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("chat_user_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("chat_user_id", id); }
    setUserId(id);
    setMessageCount(parseInt(localStorage.getItem("chat_message_count") || "0", 10));
  }, []);

  const fetchConversations = (uid: string) => {
    setConversationsLoading(true);
    fetch(`${API_URL}/conversations?user_id=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setConversationsLoading(false));
  };

  useEffect(() => {
    if (userId) fetchConversations(userId);
  }, [userId]);

  const openConversation = (id: string) => {
    setDrawerSource(null);
    fetch(`${API_URL}/conversations/${encodeURIComponent(id)}/messages`)
      .then((r) => r.json())
      .then((d) => {
        const raw: RawHistoryMessage[] = d.messages ?? [];
        const mapped: ChatMessage[] = raw.map((m) => ({ id: m.id, role: m.role, content: m.message }));
        setMessages(mapped);
        setActiveConversationId(id);
        setView("thread");
      })
      .catch(() => {});
  };

  const newEnquiry = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setDraft("");
    setLoading(false);
    setThinking(false);
    setSearching(false);
    setActiveConversationId(null);
    setDrawerSource(null);
    setView("home");
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || loading || messageCount >= MESSAGE_LIMIT || !userId) return;

    const newCount = messageCount + 1;
    setMessageCount(newCount);
    localStorage.setItem("chat_message_count", String(newCount));
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setView("thread");
    setLoading(true);
    setThinking(true);
    setSearching(false);

    const controller = new AbortController();
    abortRef.current = controller;

    let newConvId: string | null = null;

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body: JSON.stringify({
          user_id: userId,
          message: text,
          model: selectedModel,
          web_search: sourcesOn,
          conversation_id: activeConversationId,
          style: plain ? "plain" : "clinical",
        }),
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

      const ensureAssistant = () => {
        if (!assistantAdded) {
          setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
          assistantAdded = true;
        }
      };

      const updateLastAssistant = (patch: (m: ChatMessage) => ChatMessage) => {
        setMessages((prev) => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") msgs[msgs.length - 1] = patch(last);
          return msgs;
        });
      };

      const parseLine = (line: string) => {
        if (!line.trim()) return;
        let data: any;
        try { data = JSON.parse(line); } catch { return; }

        if (data.conversation_id) {
          newConvId = data.conversation_id;
          setActiveConversationId(data.conversation_id);
        } else if (data.title && newConvId) {
          setConversations((prev) => [{ id: newConvId as string, title: data.title, updated_at: new Date().toISOString() }, ...prev]);
        } else if (data.searching) {
          setSearching(true);
        } else if (typeof data.chunk === "string") {
          setThinking(false);
          setSearching(false);
          ensureAssistant();
          updateLastAssistant((m) => ({ ...m, content: m.content + data.chunk }));
        } else if (data.safety) {
          updateLastAssistant((m) => ({ ...m, safety: data.safety }));
        } else if (data.message_id !== undefined) {
          updateLastAssistant((m) => ({ ...m, id: data.message_id, streaming: false }));
        } else if (Array.isArray(data.sources)) {
          updateLastAssistant((m) => ({ ...m, sources: data.sources }));
        } else if (typeof data.error === "string") {
          if (data.rate_limited) setRateLimitedModels((prev) => new Set(prev).add(selectedModel));
          ensureAssistant();
          updateLastAssistant((m) => ({ ...m, content: m.content + (data.rate_limited ? `⚠️ ${data.error}` : `Error: ${data.error}`), streaming: false }));
        } else if (data.done) {
          updateLastAssistant((m) => ({ ...m, streaming: false }));
          fetchConversations(userId);
        }
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
      if ((err as Error)?.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
      }
    } finally {
      setLoading(false);
      setThinking(false);
      setSearching(false);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setLoading(false);
    setThinking(false);
    setSearching(false);
  };

  const handleVote = (index: number, vote: "up" | "down") => {
    const msg = messages[index];
    if (!msg?.id || !userId) return;
    const newVote = msg.vote === vote ? null : vote;
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], vote: newVote };
      return next;
    });
    fetch(`${API_URL}/messages/${encodeURIComponent(String(msg.id))}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, vote: newVote }),
    }).catch(() => {});
  };

  const handleCopy = (content: string) => {
    navigator.clipboard?.writeText(content).catch(() => {});
  };

  const eyebrow = view === "home"
    ? "GENERAL HEALTH REFERENCE"
    : `ENQUIRY · ${Math.ceil(messages.length / 2)} EXCHANGE${messages.length > 2 ? "S" : ""}`;

  const currentModel = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0];
  const isCurrentLimited = rateLimitedModels.has(selectedModel);
  const remaining = MESSAGE_LIMIT - messageCount;
  const quotaOut = messageCount >= MESSAGE_LIMIT;

  return (
    <div style={{ minHeight: "100vh", background: color.ink, color: color.text, fontFamily: "'Instrument Sans', sans-serif", display: "flex", alignItems: "stretch" }}>
      <Sidebar
        conversations={conversations}
        conversationsLoading={conversationsLoading}
        activeConversationId={activeConversationId}
        onNewEnquiry={newEnquiry}
        onOpenConversation={openConversation}
        used={messageCount}
        limit={MESSAGE_LIMIT}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", minHeight: "100vh", boxSizing: "border-box" }}>
        <Header
          eyebrow={eyebrow}
          showBorder={view === "thread"}
          models={MODELS}
          selected={selectedModel}
          rateLimited={rateLimitedModels}
          onSelect={setSelectedModel}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        {isCurrentLimited && (
          <div
            className="animate-fade-in"
            style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 26px", fontSize: 12.5, background: "rgba(232,163,61,0.08)", borderBottom: `1px solid ${color.cautionBorder}`, color: color.caution }}
          >
            <span>⚠️ <strong>{currentModel.label}</strong> is currently unavailable (rate limit).</span>
            <span style={{ color: "rgba(232,163,61,0.6)" }}>Select a different model →</span>
          </div>
        )}

        {view === "home" ? (
          <HomeView onAsk={ask} />
        ) : (
          <ThreadView
            messages={messages}
            thinking={thinking}
            searching={searching}
            sourcesOn={sourcesOn}
            onOpenSource={setDrawerSource}
            onVote={handleVote}
            onCopy={(idx) => {
              handleCopy(messages[idx]?.content ?? "");
              setCopiedIndex(idx);
              setTimeout(() => setCopiedIndex((p) => (p === idx ? null : p)), 1400);
            }}
            copiedIndex={copiedIndex}
          />
        )}

        <FloatingInput
          value={draft}
          onChange={setDraft}
          onSend={() => ask(draft)}
          onStop={stopStreaming}
          loading={loading}
          quotaOut={quotaOut}
          remaining={Math.max(0, remaining)}
          limit={MESSAGE_LIMIT}
          sourcesOn={sourcesOn}
          onToggleSources={() => setSourcesOn((v) => !v)}
          plain={plain}
          onTogglePlain={() => setPlain((v) => !v)}
        />
      </main>

      <SourceDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
    </div>
  );
}
