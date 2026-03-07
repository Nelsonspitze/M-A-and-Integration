"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="text-xs text-[#374151] leading-relaxed prose-twinrope">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Phase headers — **PHASE 1 — ...**
          strong: ({ children }) => (
            <strong className="font-semibold text-[#242C2D]">{children}</strong>
          ),
          // Regular paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          // H1–H3 (unlikely but handle them)
          h1: ({ children }) => <p className="font-semibold text-[#242C2D] mb-1 mt-3 first:mt-0">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-[#242C2D] mb-1 mt-3 first:mt-0">{children}</p>,
          h3: ({ children }) => <p className="font-medium text-[#374151] mb-1 mt-2 first:mt-0">{children}</p>,
          // Bullet lists
          ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 my-2 list-decimal list-inside">{children}</ol>,
          li: ({ children, className }) => {
            // GFM task list items
            const isTask = className?.includes("task-list-item");
            return (
              <li className={`flex items-start gap-2 ${isTask ? "" : "before:content-['→'] before:text-[#FF6400] before:shrink-0 before:mt-0"}`}>
                {children}
              </li>
            );
          },
          // Inline code
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-[#F3F4F6] rounded-lg p-3 overflow-x-auto my-2">
                  <code className="font-mono text-[11px] text-[#374151]">{children}</code>
                </pre>
              );
            }
            return <code className="font-mono bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#374151]">{children}</code>;
          },
          // Horizontal rule — use as section divider
          hr: () => <hr className="border-[#F3F4F6] my-3" />,
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#FF6400] pl-3 text-[#6B7280] my-2">{children}</blockquote>
          ),
          // Checkboxes from GFM task lists
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border shrink-0 mt-0.5 ${
                  checked ? "bg-[#9AC183] border-[#9AC183]" : "border-[#D1D5DB] bg-white"
                }`}>
                  {checked && <span className="text-white text-[8px]">✓</span>}
                </span>
              );
            }
            return null;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-1.5 h-3.5 bg-[#FF6400] ml-0.5 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}
