"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { CRMTask, TargetCompany } from "@/lib/crm/types";
import { CRM_DEPTS } from "@/lib/crm/stage-tasks";
import { MarkdownMessage } from "./markdown-message";

interface Message { role: "user" | "assistant"; content: string; }

const PROMPTS = [
  "How do I approach this evaluation?",
  "What are the key risks to look for?",
  "Draft an information request list",
  "What red flags should I flag?",
  "Give me a step-by-step checklist",
];

interface Props {
  task: CRMTask;
  company: TargetCompany;
  onClose: () => void;
}

export function CRMTaskAISidebar({ task, company, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const dept      = CRM_DEPTS[task.workstreamId] ?? { name: task.workstreamId, icon: "📋" };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setMessages([...next, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          crmContext: {
            company: {
              name: company.name, sector: company.sector, country: company.country,
              ebitdaEst: company.ebitdaEst, fte: company.fte, stage: company.stage,
              strategyFit: company.strategyFit, geographyFit: company.geographyFit,
              professionalization: company.professionalization, description: company.description,
            },
            crmTask: { title: task.title, description: task.description, workstreamId: task.workstreamId, completed: task.completed },
            deptName: dept.name,
          },
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: full };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="w-[380px] shrink-0 h-full flex flex-col bg-white border-l border-[#E5E7EB]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">{dept.icon}</span>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">{dept.name}</p>
          </div>
          <p className="text-sm font-medium text-[#242C2D] leading-snug">{task.title}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">{task.description}</p>
        </div>
        <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-10 h-10 rounded-xl sf-gradient flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <p className="text-xs text-[#9CA3AF] max-w-[200px]">
              Ask anything about this evaluation task for {company.name}.
            </p>
            <div className="flex flex-col gap-1.5 w-full mt-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/30 hover:bg-[#FFF7ED] transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div className="max-w-[80%] bg-[#F3F4F6] rounded-xl px-3 py-2 text-xs text-[#374151]">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[90%]">
                  <MarkdownMessage content={m.content} streaming={streaming && i === messages.length - 1} />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#E5E7EB]">
        {messages.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {PROMPTS.slice(0, 3).map(p => (
              <button key={p} onClick={() => send(p)} disabled={streaming}
                className="text-[10px] px-2 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-[#FFEFE5] hover:text-[#FF6400] transition-colors disabled:opacity-50">
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={2} placeholder="Ask about this task…" disabled={streaming}
            className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#242C2D] resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB] disabled:opacity-60" />
          <button onClick={() => send(input)} disabled={streaming || !input.trim()}
            className="sf-gradient text-white p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
