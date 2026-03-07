"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Trash2 } from "lucide-react";
import { CRMTask, CRMTaskNote, TargetCompany } from "@/lib/crm/types";
import { CRM_DEPTS } from "@/lib/crm/stage-tasks";
import { MarkdownMessage } from "./markdown-message";

interface Message { role: "user" | "assistant"; content: string; }

const AI_PROMPTS = [
  "How do I approach this evaluation?",
  "What are the key risks to look for?",
  "Draft an information request list",
  "What red flags should I flag?",
  "Give me a step-by-step checklist",
];

interface Props {
  task: CRMTask;
  company: TargetCompany;
  isAdmin: boolean;
  initialTab?: "work" | "ai";
  onClose: () => void;
  onSave: (updated: CRMTask) => void;
  onDelete?: () => void;
}

export function CRMTaskPanel({ task, company, isAdmin, initialTab = "work", onClose, onSave, onDelete }: Props) {
  const [tab, setTab] = useState<"work" | "ai">(initialTab);
  const dept = CRM_DEPTS[task.workstreamId] ?? { name: task.workstreamId, icon: "📋" };

  // Work tab — local editable state
  const [title, setTitle]       = useState(task.title);
  const [desc, setDesc]         = useState(task.description ?? "");
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [dueDate, setDueDate]   = useState(task.dueDate ?? "");
  const [noteInput, setNoteInput]   = useState("");
  const [noteAuthor, setNoteAuthor] = useState("");

  // AI tab state
  const [messages, setMessages]   = useState<Message[]>([]);
  const [aiInput, setAiInput]     = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync title/desc when task identity changes (new task opened)
  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description ?? "");
    setAssignee(task.assignee ?? "");
    setDueDate(task.dueDate ?? "");
  }, [task.id]);

  function buildUpdated(patch?: Partial<CRMTask>): CRMTask {
    return { ...task, title, description: desc, assignee: assignee || undefined, dueDate: dueDate || undefined, ...patch };
  }

  function addNote() {
    if (!noteInput.trim()) return;
    const note: CRMTaskNote = {
      id: crypto.randomUUID(),
      content: noteInput.trim(),
      author: noteAuthor.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    onSave(buildUpdated({ notes: [...(task.notes ?? []), note] }));
    setNoteInput("");
  }

  async function sendAI(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setAiInput("");
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
      aiInputRef.current?.focus();
    }
  }

  const notes = task.notes ?? [];

  return (
    <div className="w-[400px] shrink-0 h-full flex flex-col bg-white border-l border-[#E5E7EB]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{dept.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">{dept.name}</p>
            {isAdmin ? (
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => onSave(buildUpdated({ title }))}
                className="text-sm font-medium text-[#242C2D] w-full bg-transparent border-b border-transparent focus:border-[#FF6400]/40 focus:outline-none pb-0.5"
              />
            ) : (
              <p className="text-sm font-medium text-[#242C2D] leading-snug">{title}</p>
            )}
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["work", "ai"] as const).map(tb => (
            <button key={tb} onClick={() => setTab(tb)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-widest transition-colors ${
                tab === tb ? "bg-[#242C2D] text-white" : "text-[#9CA3AF] hover:text-[#374151]"
              }`}>
              {tb === "ai" ? "✦ AI" : "Work"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Work tab ── */}
      {tab === "work" && (
        <div className="flex-1 overflow-y-auto">
          {/* Description */}
          <div className="px-5 py-4 border-b border-[#F3F4F6]">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Description</p>
            {isAdmin ? (
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                onBlur={() => onSave(buildUpdated({ description: desc }))}
                rows={3}
                className="text-xs text-[#374151] w-full bg-transparent resize-none focus:outline-none leading-relaxed border border-transparent focus:border-[#FF6400]/30 rounded-lg px-2 py-1.5 -mx-2"
              />
            ) : (
              <p className="text-xs text-[#374151] leading-relaxed">
                {desc || <span className="text-[#D1D5DB]">No description</span>}
              </p>
            )}
          </div>

          {/* Assignee + Due date */}
          <div className="px-5 py-4 border-b border-[#F3F4F6] grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1.5">Assignee</p>
              <input
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                onBlur={() => onSave(buildUpdated({ assignee: assignee || undefined }))}
                placeholder="Name or team…"
                className="text-xs text-[#374151] w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]"
              />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1.5">Due date</p>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onBlur={() => onSave(buildUpdated({ dueDate: dueDate || undefined }))}
                className="text-xs text-[#374151] w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40"
              />
            </div>
          </div>

          {/* Findings log */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">
              Findings &amp; notes
              {notes.length > 0 && (
                <span className="ml-1.5 bg-[#F3F4F6] text-[#6B7280] px-1.5 py-0.5 rounded-full text-[9px]">
                  {notes.length}
                </span>
              )}
            </p>

            {notes.length === 0 && (
              <p className="text-[11px] text-[#D1D5DB] mb-4">No findings recorded yet.</p>
            )}

            <div className="space-y-2.5 mb-4">
              {[...notes].reverse().map(n => (
                <div key={n.id} className="bg-[#FAFAFA] border border-[#F3F4F6] rounded-xl px-3 py-2.5">
                  <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {n.author && <span className="text-[10px] font-medium text-[#9CA3AF]">{n.author}</span>}
                    {n.author && <span className="text-[#E5E7EB]">·</span>}
                    <span className="text-[10px] text-[#D1D5DB]">
                      {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="space-y-2">
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addNote(); }}
                rows={3}
                placeholder="Add a finding or observation…"
                className="text-xs text-[#374151] w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]"
              />
              <div className="flex items-center gap-2">
                <input
                  value={noteAuthor}
                  onChange={e => setNoteAuthor(e.target.value)}
                  placeholder="Your name (optional)"
                  className="flex-1 text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]"
                />
                <button
                  onClick={addNote}
                  disabled={!noteInput.trim()}
                  className="sf-gradient text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-40 whitespace-nowrap shrink-0">
                  Add finding
                </button>
              </div>
            </div>
          </div>

          {/* Admin: delete (custom tasks only) */}
          {isAdmin && task.isCustom && onDelete && (
            <div className="px-5 pb-5 pt-1">
              <button
                onClick={() => { if (confirm("Delete this task?")) onDelete(); }}
                className="flex items-center gap-1.5 text-xs text-[#EF4444] hover:text-[#DC2626] transition-colors">
                <Trash2 size={12} /> Delete task
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── AI tab ── */}
      {tab === "ai" && (
        <>
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
                  {AI_PROMPTS.map(p => (
                    <button key={p} onClick={() => sendAI(p)}
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

          <div className="px-4 pb-4 pt-2 border-t border-[#E5E7EB]">
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {AI_PROMPTS.slice(0, 3).map(p => (
                  <button key={p} onClick={() => sendAI(p)} disabled={streaming}
                    className="text-[10px] px-2 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-[#FFEFE5] hover:text-[#FF6400] transition-colors disabled:opacity-50">
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={aiInputRef}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAI(aiInput); } }}
                rows={2}
                placeholder="Ask about this task…"
                disabled={streaming}
                className="flex-1 border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#242C2D] resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB] disabled:opacity-60"
              />
              <button
                onClick={() => sendAI(aiInput)}
                disabled={streaming || !aiInput.trim()}
                className="sf-gradient text-white p-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0">
                <Send size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
