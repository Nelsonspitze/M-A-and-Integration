"use client";

import { useEffect, useState, useMemo } from "react";
import { Deal, getDeals, saveDeal, Task } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { PMI_LIBRARY } from "@/lib/pmi/library";
import { CheckCircle2, Circle, Calendar, Briefcase, AlertTriangle, Users } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PersonEntry {
  key: string;          // normalised name key for dedup
  name: string;
  role: string;
  initials: string;
  color: string;
  deals: Array<{
    deal: Deal;
    memberId: string;
  }>;
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
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => { setDeals(getDeals()); }, []);

  // Collect all unique people across all deals (deduplicated by normalised name)
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

  // All tasks for the selected person
  const personTasks = useMemo<EnrichedTask[]>(() => {
    if (!selectedKey) return [];
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
  }, [selectedKey, people]);

  // Grouped task sections
  const overdue   = personTasks.filter(e => isOverdue(e.task));
  const dueSoon   = personTasks.filter(e => isDueSoon(e.task) && !isOverdue(e.task));
  const upcoming  = personTasks.filter(e => !e.task.completed && !isOverdue(e.task) && !isDueSoon(e.task));
  const completed = personTasks.filter(e => e.task.completed);

  // Stats per person (for member list)
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

  function toggleTask(task: Task, deal: Deal) {
    const updated: Deal = { ...deal, tasks: deal.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t) };
    saveDeal(updated);
    setDeals(getDeals());
  }

  const selectedPerson = people.find(p => p.key === selectedKey) ?? null;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />

      {/* Member list */}
      <div className="w-[260px] shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden">
        <div className="px-5 pt-6 pb-4 border-b border-[#E5E7EB]">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">Team</p>
          <h2 className="text-xl font-light text-[#242C2D] heading-tight">{people.length} members</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {people.length === 0 ? (
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
                    <p className={`text-sm font-medium truncate ${active ? "text-[#FF6400]" : "text-[#242C2D]"}`}>
                      {person.name}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{person.role}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-[#9CA3AF]">{done}/{assigned} done</span>
                      {over > 0 && (
                        <span className="text-[10px] font-mono text-[#FF6400]">⚠ {over}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Task feed */}
      <main className="flex-1 overflow-y-auto">
        {!selectedPerson ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-5">
              <Users size={24} className="text-[#D1D5DB]" />
            </div>
            <h2 className="text-xl font-light text-[#242C2D] heading-tight mb-2">Select a team member</h2>
            <p className="text-sm text-[#9CA3AF] max-w-xs">
              Choose someone from the list to see their tasks across all active integrations.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-8 pt-10 pb-20">

            {/* Person header */}
            <div className="flex items-center gap-4 mb-8">
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
            </div>

            {personTasks.length === 0 ? (
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
                          <TaskRow key={e.task.id} entry={e} onToggle={toggleTask} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Task section ───────────────────────────────────────────────────────────────

function TaskSection({ label, labelColor, dot, tasks, onToggle }: {
  label: string; labelColor: string; dot: string;
  tasks: EnrichedTask[]; onToggle: (t: Task, d: Deal) => void;
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
          <TaskRow key={e.task.id} entry={e} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ entry: e, onToggle }: { entry: EnrichedTask; onToggle: (t: Task, d: Deal) => void }) {
  const over = isOverdue(e.task);
  const wsColor = wsColors[e.task.workstreamId] ?? "#9CA3AF";

  return (
    <button onClick={() => onToggle(e.task, e.deal)}
      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-start gap-3 hover:border-[#FF6400]/30 hover:shadow-sm transition-all text-left group">
      {e.task.completed
        ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: wsColor }} />
        : <Circle size={16} className={`shrink-0 mt-0.5 ${over ? "text-[#FF6400]" : "text-[#D1D5DB]"}`} />
      }
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${e.task.completed ? "line-through text-[#9CA3AF]" : "text-[#242C2D]"}`}>
          {e.task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Deal */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">
            {e.deal.addOnCompany}
          </span>
          {/* Workstream */}
          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: wsColor }}>
            {e.wsIcon} {e.wsName}
          </span>
          {/* Phase */}
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
    </button>
  );
}
