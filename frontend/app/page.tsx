"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MESSAGE_LIMIT = 10;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let id = localStorage.getItem("chat_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("chat_user_id", id);
    }
    setUserId(id);

    const count = parseInt(localStorage.getItem("chat_message_count") || "0", 10);
    setMessageCount(count);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }, [input]);

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
        body: JSON.stringify({ user_id: userId, message: text }),
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
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
            return msgs;
          });
        }
      };

      const parseLine = (line: string) => {
        if (!line.trim()) return;
        try {
          const data = JSON.parse(line);
          if (data.chunk && typeof data.chunk === "string") applyChunk(data.chunk);
          else if (data.error && typeof data.error === "string") applyChunk(`Error: ${data.error}`);
        } catch (_err) {
          // skip malformed line
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
      } catch (_err) {
        // stream was cut short — use whatever arrived
      } finally {
        reader.releaseLock();
      }

      // process any remaining buffered content (last line without trailing newline)
      parseLine(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload-file`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }

      setUploadStatus(`"${file.name}" uploaded successfully`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadStatus(`Error: ${message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm select-none">
            AI
          </div>
          <h1 className="text-base font-semibold text-gray-800">AI Assistant</h1>
        </div>

        <div className="flex items-center gap-3">
          {uploadStatus && (
            <span
              className={`text-xs px-3 py-1 rounded-full ${
                uploadStatus.startsWith("Error")
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {uploadStatus}
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <LoadingDots small /> Uploading…
              </>
            ) : (
              <>
                <UploadIcon /> Upload File
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx,.csv"
            className="hidden"
            onChange={uploadFile}
          />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold mb-2">
              AI
            </div>
            <p className="text-xl font-medium text-gray-600">How can I help you?</p>
            <p className="text-sm">Ask me anything, or upload a file (PDF, DOCX, TXT, CSV, MD) to chat with it.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border shadow-sm rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                  AI
                </div>
                <div className="bg-white border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
                  <LoadingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          {messageCount >= MESSAGE_LIMIT ? (
            <div className="flex flex-col items-center gap-2 py-3 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <p className="text-sm font-medium text-amber-800">
                You've reached the {MESSAGE_LIMIT}-message limit for this demo.
              </p>
              <p className="text-xs text-amber-600">
                Contact us to get full access.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message AI Assistant… (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-400 text-right mt-1.5">
                {MESSAGE_LIMIT - messageCount} message{MESSAGE_LIMIT - messageCount !== 1 ? "s" : ""} remaining
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingDots({ small }: { small?: boolean }) {
  const size = small ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <div className="flex gap-1 items-center">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className={`${size} bg-gray-400 rounded-full animate-bounce`}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
