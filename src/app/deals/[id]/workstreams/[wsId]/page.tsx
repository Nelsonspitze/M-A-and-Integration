"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Deal, getDeal, saveDeal, Task, WorkstreamConfig } from "@/lib/store";
import { INTEGRATION_STRATEGIES, IntegrationStrategy, PMI_LIBRARY, IntegrationItem } from "@/lib/pmi/library";
import { Sidebar } from "@/components/sidebar";
import { AISidebar, TaskAISidebar, TeamAvatar, UnassignedAvatar } from "@/components/ai-sidebar";
import { Sparkles, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, Plus, X, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const wsColors: Record<string, { dot: string; light: string }> = {
  day1:       { dot: "#FF6400", light: "#FFEFE5" },
  hr:         { dot: "#74A0F4", light: "#EEF2FE" },
  finance:    { dot: "#9AC183", light: "#F0F7EC" },
  it:         { dot: "#CDADFC", light: "#F5F0FE" },
  commercial: { dot: "#D4B800", light: "#FFFDE6" },
  operations: { dot: "#FCDCA0", light: "#FEF7E8" },
  legal:      { dot: "#8A95A5", light: "#F3F5F7" },
  culture:    { dot: "#9AC183", light: "#F2FCE8" },
};

function getWsProgress(d: Deal, wsId: string) {
  const tasks = d.tasks.filter(t => t.workstreamId === wsId);
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
}

function getWsStrategy(d: Deal, wsId: string): IntegrationStrategy {
  return d.workstreamConfigs.find(c => c.workstreamId === wsId)?.strategy ?? d.overallStrategy;
}

// ── Item card ──────────────────────────────────────────────────────────────────
function ItemCard({ item, deal, workstreamId, wsName, onUpdate, onOpenAI, onOpenTaskAI, forceOpen }: {
  item: IntegrationItem; deal: Deal; workstreamId: string; wsName: string;
  onUpdate: (d: Deal) => void; onOpenAI: () => void; onOpenTaskAI: (taskId: string) => void; forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const prevForceOpen = useRef(false);
  useEffect(() => {
    if (forceOpen && !prevForceOpen.current) setOpen(true);
    prevForceOpen.current = forceOpen ?? false;
  }, [forceOpen]);
  const [generating, setGenerating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", assigneeId: "", dueDate: "" });

  const tasks = deal.tasks.filter(t => t.itemId === item.id);
  const plan = deal.actionPlans[item.id];
  const done = tasks.filter(t => t.completed).length;
  const colors = wsColors[workstreamId] ?? wsColors.day1;
  const itemProgress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, deal, strategy: getWsStrategy(deal, workstreamId) }),
      });
      const data = await res.json();
      const updated = { ...deal, actionPlans: { ...deal.actionPlans, [item.id]: data.plan } };
      saveDeal(updated); onUpdate(updated);
    } finally { setGenerating(false); }
  }

  function toggleTask(id: string) {
    const updated = { ...deal, tasks: deal.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) };
    saveDeal(updated); onUpdate(updated);
  }

  function addTask() {
    if (!newTask.title) return;
    const t: Task = {
      id: crypto.randomUUID(), itemId: item.id, workstreamId, dealId: deal.id,
      title: newTask.title, assigneeId: newTask.assigneeId, dueDate: newTask.dueDate,
      completed: false, createdAt: new Date().toISOString(),
    };
    const updated = { ...deal, tasks: [...deal.tasks, t] };
    saveDeal(updated); onUpdate(updated);
    setNewTask({ title: "", assigneeId: "", dueDate: "" }); setShowAdd(false);
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
        <div className="flex items-start gap-4">
          {/* Clickable expand area */}
          <button className="flex-1 text-left min-w-0" onClick={() => setOpen(!open)}>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              {tasks.length > 0 && (
                done === tasks.length
                  ? <CheckCircle2 size={14} style={{ color: colors.dot }} className="shrink-0" />
                  : <Circle size={14} className="text-[#D1D5DB] shrink-0" />
              )}
              <span className="text-sm font-medium text-[#242C2D]">{item.title}</span>
              {item.synergyLink && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#9AC183]/20 text-[#374151]">
                  💰 {item.synergyLink}
                </span>
              )}
              {plan && (
                <span className="text-[10px] font-mono text-[#CDADFC] flex items-center gap-0.5">
                  <Sparkles size={9} /> Plan ready
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">{item.description}</p>
            {tasks.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 w-16 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-1 rounded-full" style={{ backgroundColor: colors.dot, width: `${itemProgress}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[#9CA3AF]">{done}/{tasks.length}</span>
              </div>
            )}
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[10px] font-mono text-[#9CA3AF] hidden sm:block">{item.typicalTimeline}</span>
            <button
              onClick={e => { e.stopPropagation(); onOpenAI(); }}
              className="flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#CDADFC]/60 hover:bg-[#F5F0FE] hover:text-[#7C3AED] transition-all">
              <Sparkles size={10} /> Plan with AI
            </button>
            <button onClick={() => setOpen(!open)} className="text-[#9CA3AF]">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#F3F4F6] divide-y divide-[#F9F9F9]">

          {/* Best practices */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Best practices</p>
            <ul className="space-y-1.5">
              {item.bestPractices.map((bp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                  <span className="shrink-0 mt-0.5" style={{ color: colors.dot }}>→</span>{bp}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div className="px-5 py-4 bg-[#FFEFE5]/40">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#FF6400] mb-3 flex items-center gap-1">
              <AlertTriangle size={10} /> Risk flags
            </p>
            <ul className="space-y-1.5">
              {item.riskFlags.map((rf, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                  <span className="text-[#FF6400] shrink-0">⚠</span>{rf}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Plan */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] flex items-center gap-1">
                <Sparkles size={10} className="text-[#CDADFC]" /> AI action plan
              </p>
              <button onClick={generatePlan} disabled={generating}
                className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:border-[#FF6400]/40 hover:bg-[#FFEFE5] hover:text-[#FF6400] text-[#374151] transition-all disabled:opacity-50">
                <Sparkles size={10} />
                {generating ? "Generating…" : plan ? "Regenerate" : "Generate Plan"}
              </button>
            </div>
            {plan
              ? <div className="bg-[#F5F0FE] rounded-xl p-4 text-xs text-[#374151] whitespace-pre-wrap leading-relaxed">{plan}</div>
              : <div className="bg-[#FAFAFA] border border-dashed border-[#E5E7EB] rounded-xl p-4 text-center">
                  <p className="text-xs text-[#9CA3AF] mb-3">No action plan yet. Use the AI sidebar for interactive planning.</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <button onClick={() => onOpenAI()}
                      className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg border border-[#CDADFC]/60 bg-[#F5F0FE] text-[#7C3AED] hover:bg-[#EDE9FE] transition-colors">
                      <Sparkles size={11} /> Plan with AI
                    </button>
                    <button onClick={generatePlan} disabled={generating}
                      className="text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50">
                      {generating ? "Generating…" : "Quick generate"}
                    </button>
                  </div>
                </div>
            }
          </div>

          {/* Tasks */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">Tasks</p>
              <button onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#FF6400] transition-colors">
                {showAdd ? <X size={11} /> : <Plus size={11} />} {showAdd ? "Cancel" : "Add task"}
              </button>
            </div>

            {tasks.length === 0 && !showAdd && (
              <p className="text-xs text-[#9CA3AF]">No tasks yet. Use AI planning above or add tasks manually.</p>
            )}

            {/* Group by phase */}
            {(() => {
              const phases = [...new Set(tasks.map(t => t.phase ?? ""))];
              return phases.map(phase => {
                const phaseTasks = tasks.filter(t => (t.phase ?? "") === phase);
                return (
                  <div key={phase} className="mb-3">
                    {phase && (
                      <p className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-widest mb-1 mt-2">{phase}</p>
                    )}
                    <div className="space-y-0.5">
                      {phaseTasks.map(task => {
                        const member = (deal.team ?? []).find(m => m.id === task.assigneeId);
                        const isDept = task.assigneeId?.startsWith("dept:");
                        const isOverdue = !task.completed && task.dueDate && task.dueDate < new Date().toISOString().split("T")[0];
                        return (
                          <div key={task.id} className="flex items-center gap-1 group/task">
                            <button onClick={() => toggleTask(task.id)}
                              className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#FAFAFA] text-left transition-colors min-w-0">
                              {task.completed
                                ? <CheckCircle2 size={15} className="shrink-0" style={{ color: colors.dot }} />
                                : <Circle size={15} className={`shrink-0 ${isOverdue ? "text-[#FF6400]" : "text-[#D1D5DB]"}`} />}
                              <span className={`text-xs flex-1 truncate ${task.completed ? "line-through text-[#9CA3AF]" : "text-[#374151]"}`}>
                                {task.title}
                              </span>
                              {isOverdue && <span className="text-[9px] font-mono text-[#FF6400] bg-[#FFEFE5] px-1.5 py-0.5 rounded-full shrink-0">overdue</span>}
                              {task.dueDate && !isOverdue && <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0">{task.dueDate}</span>}
                              {member ? <TeamAvatar member={member} /> : isDept ? (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] shrink-0">
                                  {task.assigneeId!.replace("dept:", "")}
                                </span>
                              ) : null}
                            </button>
                            <button
                              onClick={() => onOpenTaskAI(task.id)}
                              title="Ask AI about this task"
                              className="opacity-0 group-hover/task:opacity-100 shrink-0 p-1.5 rounded-lg text-[#CDADFC] hover:bg-[#F5F0FE] transition-all">
                              <Sparkles size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}

            {showAdd && (
              <div className="mt-3 p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-2">
                <Input placeholder="Task title" value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  className="h-8 text-xs rounded-lg border-[#E5E7EB]" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newTask.assigneeId}
                    onChange={e => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    className="h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                    <option value="">Unassigned</option>
                    <optgroup label="Department">
                      <option value={`dept:${workstreamId}`}>{wsName} Team</option>
                    </optgroup>
                    {(deal.team ?? []).length > 0 && (
                      <optgroup label="People">
                        {(deal.team ?? []).map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <Input type="date" value={newTask.dueDate}
                    onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="h-8 text-xs rounded-lg border-[#E5E7EB]" />
                </div>
                <button onClick={addTask}
                  className="sf-gradient text-white text-xs font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                  Add task
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workstream page ────────────────────────────────────────────────────────────
export default function WorkstreamPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [justLoadedItemId, setJustLoadedItemId] = useState<string | null>(null);

  useEffect(() => {
    const d = getDeal(params.id as string);
    if (!d) { router.push("/"); return; }
    setDeal(d);
  }, [params.id, router]);

  if (!deal) return null;

  const ws = PMI_LIBRARY.find(w => w.id === params.wsId);
  if (!ws) return null;

  const colors = wsColors[ws.id] ?? wsColors.day1;
  const wsStrategy = getWsStrategy(deal, ws.id);
  const overridden = wsStrategy !== deal.overallStrategy;
  const progress = getWsProgress(deal, ws.id);
  const activeItems = ws.items.filter(i => i.strategies.includes(wsStrategy));
  const overallStrategyLabel = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy)?.label;
  const activeItem = activeItems.find(i => i.id === activeItemId) ?? null;

  function setWsStrategy(strategy: IntegrationStrategy) {
    const configs = deal!.workstreamConfigs.filter(c => c.workstreamId !== ws!.id);
    const updated: Deal = { ...deal!, workstreamConfigs: [...configs, { workstreamId: ws!.id, strategy, owner: "", notes: "" } as WorkstreamConfig] };
    saveDeal(updated); setDeal(updated);
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8 text-xs text-[#9CA3AF]">
              <Link href={`/deals/${deal.id}`} className="flex items-center gap-1 hover:text-[#FF6400] transition-colors">
                <ArrowLeft size={12} /> {deal.addOnCompany}
              </Link>
              <span>/</span>
              <span className="text-[#242C2D] font-medium">{ws.name}</span>
            </div>

            {/* Workstream header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: colors.light }}>
                  {ws.icon}
                </div>
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Workstream</p>
                  <h1 className="text-3xl font-light text-[#242C2D] heading-tight">{ws.name}</h1>
                </div>
              </div>
              <p className="text-sm text-[#6B7280] max-w-xl">{ws.description}</p>
            </div>

            {/* Progress + strategy row */}
            <div className="grid grid-cols-2 gap-4 mb-8">

              {/* Progress */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Progress</p>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-light text-[#242C2D] heading-tight">{progress}%</span>
                  <span className="text-sm text-[#9CA3AF] mb-1">complete</span>
                </div>
                <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{ backgroundColor: colors.dot, width: `${progress}%` }} />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  {deal.tasks.filter(t => t.workstreamId === ws.id && t.completed).length} /
                  {deal.tasks.filter(t => t.workstreamId === ws.id).length} tasks done
                </p>
              </div>

              {/* Strategy override */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">Department strategy</p>
                <p className="text-xs text-[#9CA3AF] mb-3">
                  Overall: <span className="text-[#374151] font-medium">{overallStrategyLabel}</span>
                  {overridden && <span className="text-[#FF6400] ml-1">· overridden</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTEGRATION_STRATEGIES.map(s => (
                    <button key={s.value} onClick={() => setWsStrategy(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        wsStrategy === s.value
                          ? "sf-gradient text-white shadow-sm"
                          : "border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFEFE5]"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Integration items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-[#242C2D]">Integration items</h2>
                <p className="text-xs text-[#9CA3AF]">{activeItems.length} active for {INTEGRATION_STRATEGIES.find(s => s.value === wsStrategy)?.label}</p>
              </div>
              <div className="space-y-2">
                {activeItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    deal={deal}
                    workstreamId={ws.id}
                    wsName={ws.name}
                    onUpdate={setDeal}
                    onOpenAI={() => { setActiveItemId(item.id); setActiveTaskId(null); }}
                    onOpenTaskAI={taskId => { setActiveTaskId(taskId); setActiveItemId(null); }}
                    forceOpen={item.id === justLoadedItemId}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Item AI Sidebar */}
        {activeItem && (
          <AISidebar
            item={activeItem}
            deal={deal}
            workstreamId={ws.id}
            wsStrategy={wsStrategy}
            onClose={() => setActiveItemId(null)}
            onUpdate={d => { setJustLoadedItemId(activeItemId); setDeal(d); }}
          />
        )}

        {/* Task AI Sidebar */}
        {activeTaskId && (() => {
          const activeTask = deal.tasks.find(t => t.id === activeTaskId);
          const parentItem = activeTask ? activeItems.find(i => i.id === activeTask.itemId) : null;
          if (!activeTask || !parentItem) return null;
          return (
            <TaskAISidebar
              task={activeTask}
              item={parentItem}
              deal={deal}
              wsStrategy={wsStrategy}
              onClose={() => setActiveTaskId(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}
