"use client";

import { useState, useRef, useEffect } from "react";
import { Deal, Task, TeamMember, saveDeal } from "@/lib/store";
import { IntegrationItem, IntegrationStrategy } from "@/lib/pmi/library";
import { X, Sparkles, Send, Download, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PROMPTS = [
  "Draft a 90-day action plan",
  "What should we prioritise first?",
  "What are the biggest risks?",
  "Create tasks for my team",
  "Who should own this?",
];

function parseTasksFromText(text: string, item: IntegrationItem, workstreamId: string, dealId: string, team: TeamMember[]): Task[] {
  const tasks: Task[] = [];
  let currentPhase = "";

  for (const line of text.split("\n")) {
    const phaseMatch = line.match(/^\*\*PHASE\s+.+?\*\*/);
    if (phaseMatch) { currentPhase = phaseMatch[0].replace(/\*\*/g, ""); continue; }

    const taskMatch = line.match(/^-\s+\[\s*\]\s+(.+)/);
    if (!taskMatch) continue;

    let title = taskMatch[1].trim();
    let assigneeId = "";
    let dueDate = "";

    // Extract (Owner: Name) pattern
    const ownerMatch = title.match(/\(Owner:\s*([^,)]+)/i);
    if (ownerMatch) {
      const ownerName = ownerMatch[1].trim();
      const match = team.find(m =>
        m.name.toLowerCase().includes(ownerName.toLowerCase()) ||
        ownerName.toLowerCase().includes(m.name.split(" ")[0].toLowerCase())
      );
      if (match) assigneeId = match.id;
      title = title.replace(/\s*\(Owner:[^)]*\)/, "").trim();
    }

    // Extract (Due: ...) pattern
    const dueMatch = title.match(/\(Due:\s*([^)]+)\)/i);
    if (dueMatch) { title = title.replace(/\s*\(Due:[^)]*\)/, "").trim(); }

    tasks.push({
      id: crypto.randomUUID(),
      itemId: item.id,
      workstreamId,
      dealId,
      title,
      assigneeId,
      dueDate,
      completed: false,
      createdAt: new Date().toISOString(),
      phase: currentPhase || undefined,
    });
  }

  return tasks;
}

interface Props {
  item: IntegrationItem;
  deal: Deal;
  workstreamId: string;
  wsStrategy: IntegrationStrategy;
  onClose: () => void;
  onUpdate: (d: Deal) => void;
}

export function AISidebar({ item, deal, workstreamId, wsStrategy, onClose, onUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  const canLoadTasks = lastAssistant?.content.includes("✅ Ready to load as tasks") ?? false;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setTasksLoaded(false);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          item, deal, wsStrategy,
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

  function loadTasks() {
    if (!lastAssistant) return;
    const newTasks = parseTasksFromText(lastAssistant.content, item, workstreamId, deal.id, deal.team ?? []);
    if (!newTasks.length) return;

    // Remove existing tasks for this item and replace with AI tasks
    const otherTasks = deal.tasks.filter(t => t.itemId !== item.id);
    const updated: Deal = { ...deal, tasks: [...otherTasks, ...newTasks] };
    saveDeal(updated);
    onUpdate(updated);
    setTasksLoaded(true);
    setTimeout(() => onClose(), 1500);
  }

  return (
    <div className="w-[380px] shrink-0 h-full flex flex-col bg-white border-l border-[#E5E7EB]">

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg sf-gradient flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#242C2D]">AI Planning</span>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-snug">{item.title}</p>
        </div>
        <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#242C2D] transition-colors mt-0.5">
          <X size={16} />
        </button>
      </div>

      {/* Context chip */}
      <div className="px-5 py-2.5 border-b border-[#F3F4F6] bg-[#FAFAFA]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-[#9CA3AF]">Context:</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFEFE5] text-[#FF6400]">{deal.addOnCompany}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">{wsStrategy}</span>
          <span className="text-[10px] font-mono text-[#9CA3AF]">
            Day {Math.max(0, Math.floor((Date.now() - new Date(deal.closeDate).getTime()) / 86400000))}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="bg-[#F5F0FE] rounded-xl p-4">
              <p className="text-xs font-medium text-[#374151] mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#CDADFC]" /> Ready to help plan
              </p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                I know your deal context, the best practices for <strong>{item.title}</strong>, and your team. Ask me anything or use a suggested prompt below.
              </p>
            </div>

            {/* Best practices preview */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Known best practices</p>
              <ul className="space-y-1">
                {item.bestPractices.slice(0, 3).map((bp, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#374151]">
                    <span className="text-[#FF6400] shrink-0 mt-0.5">→</span>{bp}
                  </li>
                ))}
                {item.bestPractices.length > 3 && (
                  <li className="text-xs text-[#9CA3AF]">+{item.bestPractices.length - 3} more</li>
                )}
              </ul>
            </div>

            {/* Team preview */}
            {(deal.team?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Your team</p>
                <div className="flex flex-wrap gap-1.5">
                  {(deal.team ?? []).map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#F3F4F6]">
                      <div className={`w-5 h-5 rounded-full ${m.color} flex items-center justify-center`}>
                        <span className="text-[9px] font-bold text-white">{m.initials}</span>
                      </div>
                      <span className="text-[10px] text-[#374151]">{m.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "assistant" ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded sf-gradient flex items-center justify-center">
                      <Sparkles size={9} className="text-white" />
                    </div>
                    <span className="text-[10px] font-mono text-[#9CA3AF]">Claude</span>
                  </div>
                  <div className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap bg-[#FAFAFA] rounded-xl p-3 border border-[#F3F4F6]">
                    {m.content}
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#FF6400] ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#242C2D] text-white text-xs rounded-xl px-3 py-2 max-w-[80%] leading-relaxed">
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Load tasks button */}
      {canLoadTasks && !tasksLoaded && (
        <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#FFEFE5]">
          <p className="text-xs text-[#374151] mb-2 font-medium">Plan is ready to load</p>
          <button onClick={loadTasks}
            className="w-full sf-gradient text-white text-xs font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Download size={13} /> Load as tasks
          </button>
        </div>
      )}
      {tasksLoaded && (
        <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#9AC183]/10">
          <p className="text-xs text-[#374151] flex items-center gap-2">
            ✅ <span className="font-medium">Tasks loaded.</span> Close this panel to see them.
          </p>
        </div>
      )}

      {/* Suggested prompts */}
      {messages.length === 0 && (
        <div className="px-5 pt-2 pb-3 flex gap-1.5 flex-wrap border-t border-[#F3F4F6]">
          {PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="text-[10px] font-medium px-2.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFEFE5] hover:text-[#FF6400] transition-all">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#E5E7EB]">
        <div className="flex items-end gap-2 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about this integration item…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-[#242C2D] placeholder:text-[#9CA3AF] resize-none outline-none leading-relaxed"
            style={{ maxHeight: "80px" }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || streaming}
            className="shrink-0 w-7 h-7 rounded-lg sf-gradient flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30">
            <Send size={12} className="text-white" />
          </button>
        </div>
        <p className="text-[9px] text-[#9CA3AF] mt-1.5 text-center">
          Powered by Claude · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Compact avatar stack for task assignees
export function TeamAvatar({ member, size = "sm" }: { member: TeamMember; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-[10px]";
  return (
    <div title={`${member.name} · ${member.role}`}
      className={`${sz} rounded-full ${member.color} flex items-center justify-center font-bold text-white shrink-0`}>
      {member.initials}
    </div>
  );
}

export function UnassignedAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div className={`${sz} rounded-full bg-[#F3F4F6] border border-dashed border-[#D1D5DB] flex items-center justify-center`}>
      <User size={size === "sm" ? 10 : 12} className="text-[#9CA3AF]" />
    </div>
  );
}

// ── Task AI Sidebar ─────────────────────────────────────────────────────────────
const TASK_PROMPTS = [
  "How do I approach this?",
  "Break this into sub-steps",
  "What resources do I need?",
  "What are the risks?",
  "Draft an email for this",
];

interface TaskProps {
  task: Task;
  item: IntegrationItem;
  deal: Deal;
  wsStrategy: IntegrationStrategy;
  onClose: () => void;
}

export function TaskAISidebar({ task, item, deal, wsStrategy, onClose }: TaskProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const assignee = (deal.team ?? []).find(m => m.id === task.assigneeId);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          item, deal, wsStrategy,
          task: {
            title: task.title,
            assigneeName: assignee?.name ?? (task.assigneeId?.startsWith("dept:") ? task.assigneeId.replace("dept:", "") + " team" : null),
            dueDate: task.dueDate,
            completed: task.completed,
            phase: task.phase,
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
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg sf-gradient flex items-center justify-center shrink-0">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-[#242C2D]">Task AI</span>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-snug truncate">{task.title}</p>
        </div>
        <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#242C2D] transition-colors mt-0.5 shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Task meta */}
      <div className="px-5 py-2.5 border-b border-[#F3F4F6] bg-[#FAFAFA]">
        <div className="flex items-center gap-2 flex-wrap">
          {task.phase && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">{task.phase}</span>}
          {assignee && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFEFE5] text-[#FF6400]">{assignee.name.split(" ")[0]}</span>}
          {task.dueDate && <span className="text-[10px] font-mono text-[#9CA3AF]">Due {task.dueDate}</span>}
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${task.completed ? "bg-[#9AC183]/20 text-[#374151]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
            {task.completed ? "✅ Done" : "Open"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="bg-[#F5F0FE] rounded-xl p-4">
            <p className="text-xs font-medium text-[#374151] mb-1 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#CDADFC]" /> How can I help with this task?
            </p>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              I know the full deal context and what this task involves. Ask me anything.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "assistant" ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded sf-gradient flex items-center justify-center">
                      <Sparkles size={9} className="text-white" />
                    </div>
                    <span className="text-[10px] font-mono text-[#9CA3AF]">Claude</span>
                  </div>
                  <div className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap bg-[#FAFAFA] rounded-xl p-3 border border-[#F3F4F6]">
                    {m.content}
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#FF6400] ml-0.5 animate-pulse rounded-sm" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#242C2D] text-white text-xs rounded-xl px-3 py-2 max-w-[80%] leading-relaxed">
                  {m.content}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 0 && (
        <div className="px-5 pt-2 pb-3 flex gap-1.5 flex-wrap border-t border-[#F3F4F6]">
          {TASK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="text-[10px] font-medium px-2.5 py-1.5 rounded-full border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFEFE5] hover:text-[#FF6400] transition-all">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-[#E5E7EB]">
        <div className="flex items-end gap-2 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about this task…"
            rows={1}
            className="flex-1 bg-transparent text-xs text-[#242C2D] placeholder:text-[#9CA3AF] resize-none outline-none leading-relaxed"
            style={{ maxHeight: "80px" }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || streaming}
            className="shrink-0 w-7 h-7 rounded-lg sf-gradient flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30">
            <Send size={12} className="text-white" />
          </button>
        </div>
        <p className="text-[9px] text-[#9CA3AF] mt-1.5 text-center">
          Powered by Claude · Enter to send
        </p>
      </div>
    </div>
  );
}
