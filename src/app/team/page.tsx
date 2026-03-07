"use client";

import { useEffect, useState, useMemo } from "react";
import { Deal, getDeals, saveDeal, Task } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { TaskAISidebar } from "@/components/ai-sidebar";
import { PMI_LIBRARY, IntegrationStrategy } from "@/lib/pmi/library";
import { CheckCircle2, Circle, Calendar, Briefcase, AlertTriangle, Users, Sparkles, LayoutGrid } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonEntry {
  key: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  deals: Array<{ deal: Deal; memberId: string }>;
}

interface DeptEntry {
  wsId: string;
  wsName: string;
  wsIcon: string;
  color: string;
  tasks: EnrichedTask[];
}

interface EnrichedTask {
  task: Task;
  deal: Deal;
  memberId: string;
  wsName: string;
  wsIcon: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split("T")[0];

function isOverdue(task: Task) {
  return !task.completed && !!task.dueDate && task.dueDate < today();
}

function isDueSoon(task: Task) {
  if (task.completed || !task.dueDate) return false;
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  return task.dueDate <= soon.toISOString().split("T")[0] && task.dueDate >= today();
}

const wsColors: Record<string, string> = {
  day1: "#FF6400", hr: "#74A0F4", finance: "#9AC183", it: "#CDADFC",
  commercial: "#D4B800", operations: "#FCDCA0", legal: "#8A95A5", culture: "#9AC183",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [viewMode, setViewMode] = useState<"people" | "dept">("people");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activeEntry, setActiveEntry] = useState<EnrichedTask | null>(null);

  useEffect(() => { setDeals(getDeals()); }, []);

  // ── People ──────────────────────────────────────────────────────────────────

  const people = useMemo<PersonEntry[]>(() => {
    const map = new Map<string, PersonEntry>();
    for (const deal of deals) {
      for (const member of deal.team ?? []) {
        const key = member.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, { key, name: member.name, role: member.role, initials: member.initials, color: member.color, deals: [] });
        }
        map.get(key)!.deals.push({ deal, memberId: member.id });
      }
    }
    return [...map.values()];
  }, [deals]);

  const personTasks = useMemo<EnrichedTask[]>(() => {
    if (!selectedKey || viewMode !== "people") return [];
    const person = people.find(p => p.key === selectedKey);
    if (!person) return [];
    const result: EnrichedTask[] = [];
    for (const { deal, memberId } of person.deals) {
      for (const task of deal.tasks.filter(t => t.assigneeId === memberId)) {
        const ws = PMI_LIBRARY.find(w => w.id === task.workstreamId);
        result.push({ task, deal, memberId, wsName: ws?.name ?? task.workstreamId, wsIcon: ws?.icon ?? "📋" });
      }
    }
    return result;
  }, [selectedKey, people, viewMode]);

  function statsFor(person: PersonEntry) {
    let assigned = 0, done = 0, over = 0;
    for (const { deal, memberId } of person.deals) {
      const tasks = deal.tasks.filter(t => t.assigneeId === memberId);
      assigned += tasks.length;
      done += tasks.filter(t => t.completed).length;
      over += tasks.filter(t => isOverdue(t)).length;
    }
    return { assigned, done, over };
  }

  // ── Departments ─────────────────────────────────────────────────────────────

  const departments = useMemo<DeptEntry[]>(() => {
    const map = new Map<string, DeptEntry>();
    for (const deal of deals) {
      for (const task of deal.tasks) {
        const ws = PMI_LIBRARY.find(w => w.id === task.workstreamId);
        if (!ws) continue;
        if (!map.has(ws.id)) {
          map.set(ws.id, { wsId: ws.id, wsName: ws.name, wsIcon: ws.icon, color: wsColors[ws.id] ?? "#9CA3AF", tasks: [] });
        }
        map.get(ws.id)!.tasks.push({ task, deal, memberId: task.assigneeId ?? "", wsName: ws.name, wsIcon: ws.icon });
      }
    }
    return [...map.values()].sort((a, b) => a.wsName.localeCompare(b.wsName));
  }, [deals]);

  const selectedDept = departments.find(d => d.wsId === selectedKey) ?? null;

  const deptTasks = useMemo<EnrichedTask[]>(() => {
    return selectedDept?.tasks ?? [];
  }, [selectedDept]);

  // ── Active tasks (shared) ──────────────────────────────────────────────────

  const activeTasks = viewMode === "people" ? personTasks : deptTasks;
  const overdue   = activeTasks.filter(e => isOverdue(e.task));
  const dueSoon   = activeTasks.filter(e => isDueSoon(e.task) && !isOverdue(e.task));
  const upcoming  = activeTasks.filter(e => !e.task.completed && !isOverdue(e.task) && !isDueSoon(e.task));
  const completed = activeTasks.filter(e => e.task.completed);

  function toggleTask(task: Task, deal: Deal) {
    const updated: Deal = { ...deal, tasks: deal.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t) };
    saveDeal(updated);
    setDeals(getDeals());
  }

  // Derive item + wsStrategy for the active entry (needed by TaskAISidebar)
  const activeItem = activeEntry
    ? PMI_LIBRARY.flatMap(ws => ws.items).find(i => i.id === activeEntry.task.itemId) ?? null
    : null;
  const activeWsStrategy: IntegrationStrategy = activeEntry
    ? (activeEntry.deal.workstreamConfigs?.find(c => c.workstreamId === activeEntry.task.workstreamId)?.strategy
        ?? activeEntry.deal.overallStrategy as IntegrationStrategy)
    : "full";

  const selectedPerson = people.find(p => p.key === selectedKey) ?? null;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />

      {/* Left column */}
      <div className="w-[260px] shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden">
        {/* Header + view toggle */}
        <div className="px-5 pt-6 pb-3 border-b border-[#E5E7EB]">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">Team</p>
          {/* Toggle */}
          <div className="flex mt-2 bg-[#F3F4F6] rounded-lg p-0.5">
            <button onClick={() => { setViewMode("people"); setSelectedKey(null); setActiveEntry(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === "people" ? "bg-white text-[#242C2D] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}>
              <Users size={11} /> People
            </button>
            <button onClick={() => { setViewMode("dept"); setSelectedKey(null); setActiveEntry(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === "dept" ? "bg-white text-[#242C2D] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
              }`}>
              <LayoutGrid size={11} /> Depts
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {viewMode === "people" ? (
            people.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Users size={24} className="text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-xs text-[#9CA3AF]">No team members yet.</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Add members from a deal page.</p>
              </div>
            ) : (
              people.map(person => {
                const { assigned, done, over } = statsFor(person);
                const active = selectedKey === person.key;
                return (
                  <button key={person.key} onClick={() => setSelectedKey(person.key)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${
                      active ? "bg-[#FFEFE5]" : "hover:bg-[#FAFAFA]"
                    }`}>
                    <div className={`w-9 h-9 rounded-full ${person.color} flex items-center justify-center shrink-0`}>
                      <span className="text-xs font-bold text-white">{person.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? "text-[#FF6400]" : "text-[#242C2D]"}`}>{person.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{person.role}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-[#9CA3AF]">{done}/{assigned} done</span>
                        {over > 0 && <span className="text-[10px] font-mono text-[#FF6400]">⚠ {over}</span>}
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            departments.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <LayoutGrid size={24} className="text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-xs text-[#9CA3AF]">No department tasks yet.</p>
              </div>
            ) : (
              departments.map(dept => {
                const total = dept.tasks.length;
                const done = dept.tasks.filter(e => e.task.completed).length;
                const over = dept.tasks.filter(e => isOverdue(e.task)).length;
                const pct = total > 0 ? Math.round(done / total * 100) : 0;
                const active = selectedKey === dept.wsId;
                return (
                  <button key={dept.wsId} onClick={() => setSelectedKey(dept.wsId)}
                    className={`w-full text-left px-4 py-3 transition-colors ${active ? "bg-[#FFEFE5]" : "hover:bg-[#FAFAFA]"}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg shrink-0">{dept.wsIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${active ? "text-[#FF6400]" : "text-[#242C2D]"}`}>{dept.wsName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-[#9CA3AF]">{done}/{total} done</span>
                          {over > 0 && <span className="text-[10px] font-mono text-[#FF6400]">⚠ {over}</span>}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-1.5 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: dept.color }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0">{pct}%</span>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Task feed + AI sidebar */}
      <main className="flex-1 flex overflow-hidden">
        {/* Scrollable feed */}
        <div className="flex-1 overflow-y-auto">
          {(viewMode === "people" ? !selectedPerson : !selectedDept) ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-5">
                {viewMode === "people" ? <Users size={24} className="text-[#D1D5DB]" /> : <LayoutGrid size={24} className="text-[#D1D5DB]" />}
              </div>
              <h2 className="text-xl font-light text-[#242C2D] heading-tight mb-2">
                {viewMode === "people" ? "Select a team member" : "Select a department"}
              </h2>
              <p className="text-sm text-[#9CA3AF] max-w-xs">
                {viewMode === "people"
                  ? "Choose someone from the list to see their tasks across all active integrations."
                  : "Choose a department to see its progress across all integrations."}
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-8 pt-10 pb-20">

              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                {viewMode === "people" && selectedPerson ? (
                  <>
                    <div className={`w-14 h-14 rounded-full ${selectedPerson.color} flex items-center justify-center shrink-0`}>
                      <span className="text-lg font-bold text-white">{selectedPerson.initials}</span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-light text-[#242C2D] heading-tight">{selectedPerson.name}</h1>
                      <p className="text-sm text-[#9CA3AF]">{selectedPerson.role}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                          <Briefcase size={10} /> {selectedPerson.deals.length} integration{selectedPerson.deals.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                          <CheckCircle2 size={10} /> {statsFor(selectedPerson).done}/{statsFor(selectedPerson).assigned} tasks done
                        </span>
                        {statsFor(selectedPerson).over > 0 && (
                          <span className="text-[10px] font-mono text-[#FF6400] flex items-center gap-1">
                            <AlertTriangle size={10} /> {statsFor(selectedPerson).over} overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : selectedDept ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center shrink-0 text-3xl">
                      {selectedDept.wsIcon}
                    </div>
                    <div>
                      <h1 className="text-3xl font-light text-[#242C2D] heading-tight">{selectedDept.wsName}</h1>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          {deptTasks.filter(e => e.task.completed).length}/{deptTasks.length} tasks done
                        </span>
                        {deptTasks.filter(e => isOverdue(e.task)).length > 0 && (
                          <span className="text-[10px] font-mono text-[#FF6400] flex items-center gap-1">
                            <AlertTriangle size={10} /> {deptTasks.filter(e => isOverdue(e.task)).length} overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {activeTasks.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
                  <p className="text-sm text-[#9CA3AF]">No tasks assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-8">

                  {/* Overdue */}
                  {overdue.length > 0 && (
                    <TaskSection
                      label="Overdue"
                      labelColor="text-[#FF6400]"
                      dot="bg-[#FF6400]"
                      tasks={overdue}
                      onToggle={toggleTask}
                      onOpenAI={setActiveEntry}
                      activeId={activeEntry?.task.id ?? null}
                    />
                  )}

                  {/* Due soon */}
                  {dueSoon.length > 0 && (
                    <TaskSection
                      label="Due this week"
                      labelColor="text-[#D4B800]"
                      dot="bg-[#FCDCA0]"
                      tasks={dueSoon}
                      onToggle={toggleTask}
                      onOpenAI={setActiveEntry}
                      activeId={activeEntry?.task.id ?? null}
                    />
                  )}

                  {/* Upcoming */}
                  {upcoming.length > 0 && (
                    <TaskSection
                      label="Upcoming"
                      labelColor="text-[#374151]"
                      dot="bg-[#D1D5DB]"
                      tasks={upcoming}
                      onToggle={toggleTask}
                      onOpenAI={setActiveEntry}
                      activeId={activeEntry?.task.id ?? null}
                    />
                  )}

                  {/* Completed */}
                  {completed.length > 0 && (
                    <div>
                      <button onClick={() => setShowCompleted(v => !v)}
                        className="flex items-center gap-2 mb-3 text-[#9CA3AF] hover:text-[#374151] transition-colors">
                        <span className="w-2 h-2 rounded-full bg-[#9AC183] shrink-0" />
                        <span className="text-[11px] font-mono uppercase tracking-widest">
                          Completed ({completed.length})
                        </span>
                        <span className="text-[10px]">{showCompleted ? "▲" : "▼"}</span>
                      </button>
                      {showCompleted && (
                        <div className="space-y-1">
                          {completed.map(e => (
                            <TaskRow key={e.task.id} entry={e} onToggle={toggleTask}
                              onOpenAI={setActiveEntry} activeId={activeEntry?.task.id ?? null} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {/* TaskAISidebar */}
        {activeEntry && activeItem && (
          <TaskAISidebar
            task={activeEntry.task}
            item={activeItem}
            deal={activeEntry.deal}
            wsStrategy={activeWsStrategy}
            onClose={() => setActiveEntry(null)}
          />
        )}
      </main>
    </div>
  );
}

// ── Task section ───────────────────────────────────────────────────────────────

function TaskSection({ label, labelColor, dot, tasks, onToggle, onOpenAI, activeId }: {
  label: string; labelColor: string; dot: string;
  tasks: EnrichedTask[]; onToggle: (t: Task, d: Deal) => void;
  onOpenAI: (e: EnrichedTask) => void; activeId: string | null;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
        <span className={`text-[11px] font-mono uppercase tracking-widest ${labelColor}`}>{label}</span>
        <span className="text-[10px] font-mono text-[#9CA3AF]">{tasks.length}</span>
      </div>
      <div className="space-y-1.5">
        {tasks.sort((a, b) => (a.task.dueDate ?? "").localeCompare(b.task.dueDate ?? "")).map(e => (
          <TaskRow key={e.task.id} entry={e} onToggle={onToggle} onOpenAI={onOpenAI} activeId={activeId} />
        ))}
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ entry: e, onToggle, onOpenAI, activeId }: {
  entry: EnrichedTask; onToggle: (t: Task, d: Deal) => void;
  onOpenAI: (e: EnrichedTask) => void; activeId: string | null;
}) {
  const over = isOverdue(e.task);
  const wsColor = wsColors[e.task.workstreamId] ?? "#9CA3AF";
  const isActive = activeId === e.task.id;

  return (
    <div className={`group/row flex items-stretch gap-1 ${isActive ? "ring-1 ring-[#FF6400]/30 rounded-xl" : ""}`}>
      {/* Checkbox toggle */}
      <button onClick={() => onToggle(e.task, e.deal)}
        className="shrink-0 flex items-start pt-3.5 pl-3 pr-1">
        {e.task.completed
          ? <CheckCircle2 size={16} className="shrink-0" style={{ color: wsColor }} />
          : <Circle size={16} className={`shrink-0 ${over ? "text-[#FF6400]" : "text-[#D1D5DB]"}`} />
        }
      </button>

      {/* Main content — clicking opens AI */}
      <button onClick={() => onOpenAI(e)}
        className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-3 py-3 flex items-start gap-3 hover:border-[#FF6400]/30 hover:shadow-sm transition-all text-left">
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${e.task.completed ? "line-through text-[#9CA3AF]" : "text-[#242C2D]"}`}>
            {e.task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
              {e.deal.addOnCompany}
            </span>
            <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: wsColor }}>
              {e.wsIcon} {e.wsName}
            </span>
            {e.task.phase && (
              <span className="text-[10px] font-mono text-[#9CA3AF]">{e.task.phase}</span>
            )}
          </div>
        </div>
        {/* Due date */}
        {e.task.dueDate && (
          <div className={`shrink-0 text-right ${over ? "text-[#FF6400]" : "text-[#9CA3AF]"}`}>
            <p className="text-[10px] font-mono flex items-center gap-1">
              <Calendar size={9} /> {e.task.dueDate}
            </p>
            {over && <p className="text-[9px] font-mono">overdue</p>}
          </div>
        )}
        {/* Sparkle hint */}
        <Sparkles size={12} className="shrink-0 mt-0.5 text-[#FF6400] opacity-0 group-hover/row:opacity-60 transition-opacity" />
      </button>
    </div>
  );
}
