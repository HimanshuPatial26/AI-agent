"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  content:   string;
  streaming?: boolean;
}

export default function MarkdownMessage({ content, streaming }: Props) {
  return (
    <div className={streaming ? "markdown-streaming" : undefined}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /* ── Block elements ── */
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-white mb-2 mt-4 first:mt-0 pb-1 border-b border-white/10">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-white mb-1.5 mt-3 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-white/90 mb-1 mt-2 first:mt-0">{children}</h3>
          ),

          /* ── Inline formatting ── */
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic opacity-80">{children}</em>
          ),
          del: ({ children }) => (
            <del className="line-through opacity-50">{children}</del>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors"
              style={{ color: "#8FB4FF" }}>
              {children}
            </a>
          ),

          /* ── Lists ── */
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          /* ── Quote / rule ── */
          blockquote: ({ children }) => (
            <blockquote className="pl-3 my-2 opacity-70 italic" style={{ borderLeft: "2px solid rgba(143,180,255,0.4)" }}>
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-white/10 my-3" />,

          /* ── Tables (GFM) ── */
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-white/[0.08]">
              <table className="text-xs w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.04] border-b border-white/[0.08]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold text-white/70">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-white/[0.04] text-white/60">{children}</td>
          ),

          /* ── Code ── */
          /* Strip the <pre> wrapper — SyntaxHighlighter provides its own */
          pre: ({ children }) => <>{children}</>,

          code: ({ className, children, ...props }: any) => {
            const match   = /language-(\w+)/.exec(className || "");
            const codeStr = String(children).replace(/\n$/, "");
            const isBlock = match || codeStr.includes("\n");

            if (isBlock) {
              return (
                <SyntaxHighlighter
                  language={match?.[1] || "text"}
                  style={oneDark}
                  PreTag="div"
                  customStyle={{
                    margin:       "8px 0",
                    borderRadius: "10px",
                    background:   "rgba(0,0,0,0.45)",
                    padding:      "12px 14px",
                    fontSize:     "12px",
                    lineHeight:   "1.6",
                    border:       "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {codeStr}
                </SyntaxHighlighter>
              );
            }

            /* inline code */
            return (
              <code
                className="rounded px-1.5 py-0.5 text-[11px] font-mono"
                style={{ background: "rgba(143,180,255,0.12)", color: "#8FB4FF" }}
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
