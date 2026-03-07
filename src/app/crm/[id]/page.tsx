"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { TargetCompany, ContactPerson, ContactEntry, CRMTask, CRMDocument, DocType, GeographyFit, Priority, ContactType } from "@/lib/crm/types";
import { getTarget, saveTarget, deleteTarget, advanceStage, nextStage, STAGES, stageIndex, daysInStage, qualificationScore } from "@/lib/crm/store";
import { CRM_DEPTS, saveCustomTemplate } from "@/lib/crm/stage-tasks";
import { CRMTaskAISidebar } from "@/components/crm-task-ai";
import { IntegrationStrategy } from "@/lib/pmi/library";
import {
  ChevronLeft, Trash2, Plus, X, ExternalLink, Upload,
  Phone, Mail, Users, FileText, Check, CheckCircle2, Circle, AlertTriangle, Lock, Sparkles, UploadCloud,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SECTORS = [
  "Healthcare", "Business Services", "Technology", "Industrial", "Consumer",
  "Financial Services", "Construction & Real Estate", "Logistics", "Other",
];

const contactTypeIcon: Record<ContactType, React.ReactNode> = {
  call:    <Phone size={12} />,
  email:   <Mail size={12} />,
  meeting: <Users size={12} />,
  note:    <FileText size={12} />,
};

const contactTypeColor: Record<ContactType, string> = {
  call:    "text-[#74A0F4] bg-[#EEF2FF]",
  email:   "text-[#CDADFC] bg-[#F5F3FF]",
  meeting: "text-[#FF6400] bg-[#FFEFE5]",
  note:    "text-[#9CA3AF] bg-[#F3F4F6]",
};

function scoreColor(s: number) {
  if (s >= 70) return "#9AC183";
  if (s >= 45) return "#D4B800";
  return "#9CA3AF";
}

// ── Stage progress bar ─────────────────────────────────────────────────────────

function StageBar({ current }: { current: string }) {
  const idx = stageIndex(current as Parameters<typeof stageIndex>[0]);
  return (
    <div className="flex items-center gap-0">
      {STAGES.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
              i < idx  ? "border-[#FF6400] bg-[#FF6400]" :
              i === idx ? "border-[#FF6400] bg-white scale-125" :
              "border-[#E5E7EB] bg-white"
            }`} />
          </div>
          {i < STAGES.length - 1 && (
            <div className={`h-px w-6 ${i < idx ? "bg-[#FF6400]" : "bg-[#E5E7EB]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Qualification bar ──────────────────────────────────────────────────────────

function QBar({ label, value, max = 5, color = "#FF6400" }: {
  label: string; value: number; max?: number; color?: string;
}) {
  const pct = Math.round(value / max * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-[#6B7280]">{label}</span>
        <span className="text-[11px] font-mono text-[#374151]">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
        className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
    </div>
  );
}

// ── Document helpers ──────────────────────────────────────────────────────────

export const DOC_ICONS: Record<string, string> = {
  link: "🔗", note: "📝", pdf: "📄", excel: "📊",
  word: "📃", presentation: "📋", contract: "⚖️", financial: "💰", other: "📁",
};

function DocRow({ doc, onRemove }: { doc: CRMDocument; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const dept = doc.workstreamId ? CRM_DEPTS[doc.workstreamId] : null;
  const stageMeta = doc.stage ? STAGES.find(s => s.id === doc.stage) : null;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-lg shrink-0">{DOC_ICONS[doc.type] ?? "📁"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#242C2D]">{doc.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {stageMeta && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151]">{stageMeta.label}</span>
            )}
            {dept && (
              <span className="text-[10px] font-mono text-[#6B7280]">{dept.icon} {dept.name}</span>
            )}
            <span className="text-[10px] font-mono text-[#D1D5DB]">{doc.addedAt.split("T")[0]}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {doc.url && (
            <a href={doc.url} target="_blank" rel="noreferrer"
              className="p-1.5 text-[#9CA3AF] hover:text-[#74A0F4] transition-colors rounded-lg hover:bg-[#EEF2FF]">
              <ExternalLink size={14} />
            </a>
          )}
          {doc.content && (
            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 text-[#9CA3AF] hover:text-[#FF6400] transition-colors rounded-lg hover:bg-[#FFEFE5]">
              <FileText size={14} />
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 text-[#D1D5DB] hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
            <X size={13} />
          </button>
        </div>
      </div>
      {expanded && doc.content && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6]">
          <pre className="mt-3 text-xs text-[#374151] whitespace-pre-wrap leading-relaxed font-sans">{doc.content}</pre>
        </div>
      )}
      {doc.notes && !expanded && (
        <div className="px-4 pb-3 border-t border-[#F3F4F6] pt-2">
          <p className="text-[11px] text-[#9CA3AF]">{doc.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CRMDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [t, setT] = useState<TargetCompany | null>(null);
  const [tab, setTab] = useState<"overview" | "checklist" | "contacts" | "timeline" | "documents">("overview");
  const [dirty, setDirty] = useState(false);
  const [activeCrmTask, setActiveCrmTask] = useState<CRMTask | null>(null);

  // Contact log form
  const [logType, setLogType]     = useState<ContactType>("call");
  const [logDate, setLogDate]     = useState(new Date().toISOString().split("T")[0]);
  const [logSummary, setLogSummary] = useState("");

  // New contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [cpName, setCpName]   = useState("");
  const [cpRole, setCpRole]   = useState("");
  const [cpEmail, setCpEmail] = useState("");

  // Document form
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docTitle, setDocTitle]   = useState("");
  const [docType, setDocType]     = useState<DocType>("link");
  const [docUrl, setDocUrl]       = useState("");
  const [docContent, setDocContent] = useState("");
  const [docStage, setDocStage]   = useState("");
  const [docWs, setDocWs]         = useState("");
  const [docNotes, setDocNotes]   = useState("");

  useEffect(() => { setT(getTarget(id)); }, [id]);

  function update(patch: Partial<TargetCompany>) {
    if (!t) return;
    const updated = { ...t, ...patch };
    setT(updated);
    setDirty(true);
    return updated;
  }

  function save() {
    if (!t) return;
    saveTarget(t);
    setDirty(false);
  }

  function handleAdvance() {
    if (!t) return;
    const next = nextStage(t.stage);
    if (!next) return;
    const updated = advanceStage(t, next);
    setT(updated);
    setDirty(false);
  }

  function handleDelete() {
    if (!t || !confirm(`Delete ${t.name}? This cannot be undone.`)) return;
    deleteTarget(t.id);
    router.push("/crm");
  }

  function addLogEntry() {
    if (!logSummary.trim() || !t) return;
    const entry: ContactEntry = {
      id: crypto.randomUUID(), date: logDate,
      type: logType, summary: logSummary.trim(),
    };
    const updated = { ...t, contactLog: [entry, ...t.contactLog] };
    setT(updated);
    saveTarget(updated);
    setLogSummary("");
  }

  function addContact() {
    if (!cpName.trim() || !t) return;
    const cp: ContactPerson = {
      id: crypto.randomUUID(), name: cpName.trim(),
      role: cpRole.trim(), email: cpEmail.trim() || undefined,
    };
    const updated = { ...t, contacts: [...t.contacts, cp] };
    setT(updated);
    saveTarget(updated);
    setCpName(""); setCpRole(""); setCpEmail("");
    setShowAddContact(false);
  }

  function removeContact(cpId: string) {
    if (!t) return;
    const updated = { ...t, contacts: t.contacts.filter(c => c.id !== cpId) };
    setT(updated);
    saveTarget(updated);
  }

  function addDocument() {
    if (!docTitle.trim() || !t) return;
    const doc: CRMDocument = {
      id: crypto.randomUUID(), title: docTitle.trim(), type: docType,
      url: docUrl.trim() || undefined, content: docContent.trim() || undefined,
      stage: (docStage as CRMDocument["stage"]) || undefined,
      workstreamId: docWs || undefined, notes: docNotes.trim() || undefined,
      addedAt: new Date().toISOString(),
    };
    const updated = { ...t, documents: [doc, ...(t.documents ?? [])] };
    setT(updated);
    saveTarget(updated);
    setDocTitle(""); setDocUrl(""); setDocContent(""); setDocStage("");
    setDocWs(""); setDocNotes(""); setShowAddDoc(false);
  }

  function removeDocument(docId: string) {
    if (!t) return;
    const updated = { ...t, documents: (t.documents ?? []).filter(d => d.id !== docId) };
    setT(updated);
    saveTarget(updated);
  }

  function pushAsTemplate() {
    if (!t) return;
    const tasks = stageTasks.map(ct => ({ workstreamId: ct.workstreamId, title: ct.title, description: ct.description }));
    saveCustomTemplate(t.stage, tasks);
    alert(`✅ ${stageMeta.label} stage tasks set as platform default for all new targets.`);
  }

  if (!t) return null;

  const score    = qualificationScore(t);
  const days     = daysInStage(t);
  const next     = nextStage(t.stage);
  const nextMeta = next ? STAGES.find(s => s.id === next) : null;
  const stageMeta = STAGES.find(s => s.id === t.stage)!;

  // Current-stage checklist tasks
  const stageTasks = (t.crmTasks ?? []).filter(ct => ct.stage === t.stage);
  const stageTasksDone = stageTasks.filter(ct => ct.completed).length;
  const stageTasksTotal = stageTasks.length;
  const allDone = stageTasksDone === stageTasksTotal;

  // Derived qualification sub-scores
  const geoScore  = t.geographyFit === "core" ? 5 : t.geographyFit === "adjacent" ? 3 : 1;
  const fitScore  = t.strategyFit === "full" ? 5 : t.strategyFit === "partial" ? 4 : t.strategyFit === "bolt-on" ? 4 : 2;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-8 pt-6 pb-5 bg-white border-b border-[#E5E7EB] shrink-0">
          {/* Breadcrumb */}
          <Link href="/crm" className="flex items-center gap-1 text-[11px] font-mono text-[#9CA3AF] hover:text-[#374151] transition-colors mb-4">
            <ChevronLeft size={12} /> Pipeline
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Name (editable inline) */}
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-light text-[#242C2D] heading-tight">{t.name}</h1>
                {dirty && (
                  <button onClick={save}
                    className="flex items-center gap-1 text-xs font-medium text-[#FF6400] border border-[#FF6400]/30 px-2.5 py-1 rounded-lg hover:bg-[#FFEFE5] transition-colors">
                    <Check size={11} /> Save
                  </button>
                )}
              </div>
              <p className="text-sm text-[#6B7280] mb-3">{t.sector}{t.country ? ` · ${t.country}` : ""}</p>

              {/* Stage bar */}
              <div className="flex items-center gap-4">
                <StageBar current={t.stage} />
                <span className="text-[11px] font-mono text-[#9CA3AF]">{days}d in {stageMeta.label}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xl font-light tabular-nums" style={{ color: scoreColor(score) }}>{score}</span>
              <span className="text-[11px] font-mono text-[#9CA3AF]">/100</span>
              {nextMeta && stageTasksTotal > 0 && !allDone && (
                <button onClick={() => setTab("checklist")}
                  className="flex items-center gap-1.5 border border-[#E5E7EB] text-[#6B7280] text-xs font-medium px-3 py-2 rounded-lg hover:bg-[#FFF7ED] hover:text-[#FF6400] hover:border-[#FF6400]/30 transition-all">
                  <Lock size={11} /> {stageTasksDone}/{stageTasksTotal} done
                </button>
              )}
              {nextMeta && (
                <button
                  onClick={() => {
                    if (!allDone && stageTasksTotal > 0) {
                      const pending = stageTasks.filter(ct => !ct.completed).map(ct => `· ${CRM_DEPTS[ct.workstreamId]?.name ?? ct.workstreamId}`).join("\n");
                      if (!confirm(`${stageTasksTotal - stageTasksDone} department task(s) are still open:\n\n${pending}\n\nAdvance anyway?`)) return;
                    }
                    handleAdvance();
                  }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-opacity ${
                    allDone || stageTasksTotal === 0
                      ? "sf-gradient text-white hover:opacity-90"
                      : "bg-[#F3F4F6] text-[#9CA3AF] hover:bg-[#E5E7EB]"
                  }`}>
                  → {nextMeta.label}
                </button>
              )}
              <button onClick={handleDelete} className="p-2 text-[#D1D5DB] hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8 bg-white border-b border-[#E5E7EB] shrink-0">
          <div className="flex gap-0">
            {(["overview","checklist","documents","contacts","timeline"] as const).map(tb => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`px-4 py-3 text-xs font-medium capitalize border-b-2 transition-colors flex items-center gap-1.5 ${
                  tab === tb ? "border-[#FF6400] text-[#FF6400]" : "border-transparent text-[#6B7280] hover:text-[#374151]"
                }`}>
                {tb === "checklist" && !allDone && stageTasksTotal > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6400] shrink-0" />
                )}
                {tb === "checklist" ? `Checklist (${stageTasksDone}/${stageTasksTotal})`
                  : tb === "documents" ? `Documents (${(t.documents ?? []).length})`
                  : tb === "contacts" ? `Contacts (${t.contacts.length})`
                  : tb === "timeline" ? `Timeline (${t.contactLog.length})`
                  : "Overview"}
              </button>
            ))}
          </div>
        </div>

        {/* Content + AI sidebar */}
        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8">

          {/* ── Checklist ── */}
          {tab === "checklist" && (
            <div className="max-w-2xl">
              {/* Stage header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">{stageMeta.label} stage</p>
                  <h2 className="text-xl font-light text-[#242C2D]">Department evaluation tasks</h2>
                  <p className="text-xs text-[#9CA3AF] mt-1">All departments must complete their tasks before advancing.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={pushAsTemplate}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-[#9CA3AF] border border-[#E5E7EB] px-3 py-1.5 rounded-lg hover:border-[#FF6400]/30 hover:text-[#FF6400] transition-colors">
                    ↑ Set as platform default
                  </button>
                  <div className="text-right">
                    <p className="text-2xl font-light tabular-nums" style={{ color: allDone ? "#9AC183" : "#FF6400" }}>
                      {stageTasksDone}/{stageTasksTotal}
                    </p>
                    <p className="text-[10px] font-mono text-[#9CA3AF]">tasks done</p>
                  </div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-8">
                <div className="h-full rounded-full transition-all" style={{
                  width: stageTasksTotal > 0 ? `${Math.round(stageTasksDone / stageTasksTotal * 100)}%` : "0%",
                  backgroundColor: allDone ? "#9AC183" : "#FF6400",
                }} />
              </div>

              {stageTasks.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
                  <p className="text-sm text-[#9CA3AF]">No tasks defined for this stage.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group tasks by workstream */}
                  {Object.entries(
                    stageTasks.reduce<Record<string, CRMTask[]>>((acc, ct) => {
                      (acc[ct.workstreamId] ??= []).push(ct); return acc;
                    }, {})
                  ).map(([wsId, tasks]) => {
                    const dept = CRM_DEPTS[wsId] ?? { name: wsId, icon: "📋" };
                    const deptDone = tasks.filter(ct => ct.completed).length;
                    const deptComplete = deptDone === tasks.length;
                    return (
                      <div key={wsId} className={`bg-white border rounded-xl overflow-hidden ${deptComplete ? "border-[#9AC183]/40" : "border-[#E5E7EB]"}`}>
                        {/* Dept header */}
                        <div className={`px-4 py-3 flex items-center gap-3 border-b ${deptComplete ? "bg-[#F0FDF4] border-[#9AC183]/20" : "bg-[#FAFAFA] border-[#E5E7EB]"}`}>
                          <span className="text-lg">{dept.icon}</span>
                          <span className={`text-sm font-medium flex-1 ${deptComplete ? "text-[#9AC183]" : "text-[#242C2D]"}`}>{dept.name}</span>
                          {deptComplete ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-[#9AC183]">
                              <CheckCircle2 size={12} /> complete
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#9CA3AF]">{deptDone}/{tasks.length}</span>
                          )}
                        </div>

                        {/* Tasks */}
                        <div className="divide-y divide-[#F3F4F6]">
                          {tasks.map(ct => (
                            <div key={ct.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[#FAFAFA] transition-colors group/task">
                              {/* Toggle checkbox */}
                              <button onClick={() => {
                                const updated: TargetCompany = {
                                  ...t,
                                  crmTasks: t.crmTasks.map(x =>
                                    x.id === ct.id
                                      ? { ...x, completed: !x.completed, completedAt: !x.completed ? new Date().toISOString() : undefined }
                                      : x
                                  ),
                                };
                                setT(updated);
                                saveTarget(updated);
                              }} className="shrink-0 mt-0.5">
                                {ct.completed
                                  ? <CheckCircle2 size={16} className="text-[#9AC183]" />
                                  : <Circle size={16} className="text-[#D1D5DB] group-hover/task:text-[#FF6400] transition-colors" />
                                }
                              </button>
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${ct.completed ? "line-through text-[#9CA3AF]" : "text-[#242C2D]"}`}>{ct.title}</p>
                                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{ct.description}</p>
                              </div>
                              {/* Sparkle button — work with AI */}
                              <button
                                onClick={() => setActiveCrmTask(activeCrmTask?.id === ct.id ? null : ct)}
                                className={`shrink-0 mt-0.5 p-1 rounded-lg transition-all ${
                                  activeCrmTask?.id === ct.id
                                    ? "bg-[#FFEFE5] text-[#FF6400]"
                                    : "text-[#D1D5DB] opacity-0 group-hover/task:opacity-100 hover:bg-[#FFEFE5] hover:text-[#FF6400]"
                                }`}
                                title="Work on this with AI">
                                <Sparkles size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Advance CTA */}
              {nextMeta && (
                <div className={`mt-8 p-5 rounded-2xl border ${allDone ? "bg-[#F0FDF4] border-[#9AC183]/30" : "bg-[#FAFAFA] border-[#E5E7EB]"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      {allDone ? (
                        <>
                          <p className="text-sm font-medium text-[#9AC183]">All tasks complete</p>
                          <p className="text-xs text-[#9CA3AF] mt-0.5">Ready to advance to {nextMeta.label}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-[#374151] flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-[#FF6400]" />
                            {stageTasksTotal - stageTasksDone} task{stageTasksTotal - stageTasksDone > 1 ? "s" : ""} remaining
                          </p>
                          <p className="text-xs text-[#9CA3AF] mt-0.5">Complete all tasks or advance manually</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!allDone) {
                          const pending = stageTasks.filter(ct => !ct.completed).map(ct => `· ${CRM_DEPTS[ct.workstreamId]?.name ?? ct.workstreamId}`).join("\n");
                          if (!confirm(`${stageTasksTotal - stageTasksDone} task(s) still open:\n\n${pending}\n\nAdvance anyway?`)) return;
                        }
                        handleAdvance();
                      }}
                      className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl transition-opacity shrink-0 ${
                        allDone ? "sf-gradient text-white hover:opacity-90" : "bg-[#E5E7EB] text-[#6B7280] hover:bg-[#D1D5DB]"
                      }`}>
                      → {nextMeta.label}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div className="grid grid-cols-2 gap-8 max-w-4xl">

              {/* Left: basic info */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Basic info</h3>
                <Field label="Company name" value={t.name} onChange={v => update({ name: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Sector</label>
                    <select value={t.sector} onChange={e => update({ sector: e.target.value })}
                      className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/40 bg-white">
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Field label="Country" value={t.country} onChange={v => update({ country: v })} placeholder="NL" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" value={t.city ?? ""} onChange={v => update({ city: v })} />
                  <Field label="Website" value={t.website ?? ""} onChange={v => update({ website: v })} placeholder="https://…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="EBITDA est. (€k)" type="number" value={String(t.ebitdaEst ?? "")} onChange={v => update({ ebitdaEst: Number(v) || undefined })} placeholder="500" />
                  <Field label="Revenue est. (€k)" type="number" value={String(t.revenueEst ?? "")} onChange={v => update({ revenueEst: Number(v) || undefined })} placeholder="2000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="FTE" type="number" value={String(t.fte ?? "")} onChange={v => update({ fte: Number(v) || undefined })} placeholder="50" />
                  <Field label="Founded" type="number" value={String(t.founded ?? "")} onChange={v => update({ founded: Number(v) || undefined })} placeholder="2005" />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Description</label>
                  <textarea value={t.description ?? ""} onChange={e => update({ description: e.target.value })}
                    rows={3} placeholder="Brief description of the company…"
                    className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/40 resize-none placeholder:text-[#D1D5DB]" />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Notes</label>
                  <textarea value={t.notes ?? ""} onChange={e => update({ notes: e.target.value })}
                    rows={3} placeholder="Internal notes…"
                    className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/40 resize-none placeholder:text-[#D1D5DB]" />
                </div>
                {dirty && (
                  <button onClick={save}
                    className="w-full sf-gradient text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity">
                    Save changes
                  </button>
                )}
              </div>

              {/* Right: qualification */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-4">Qualification score</h3>
                  {/* Big score */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4 flex items-center gap-4">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={scoreColor(score)} strokeWidth="3"
                          strokeDasharray={`${score} ${100 - score}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-light text-[#242C2D]">{score >= 70 ? "Strong fit" : score >= 45 ? "Moderate fit" : "Weak fit"}</p>
                      <p className="text-xs text-[#9CA3AF]">Based on 4 criteria</p>
                    </div>
                  </div>

                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
                    <QBar label="Geography fit" value={geoScore} max={5} color="#74A0F4" />
                    <QBar label="Strategy fit" value={fitScore} max={5} color="#FF6400" />
                    <QBar label="Professionalization" value={t.professionalization} max={5} color="#CDADFC" />
                    {t.ebitdaEst && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-[11px] text-[#6B7280]">EBITDA</span>
                          <span className="text-[11px] font-mono text-[#374151]">
                            €{t.ebitdaEst >= 1000 ? `${(t.ebitdaEst/1000).toFixed(1)}M` : `${t.ebitdaEst}k`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Criteria selectors */}
                <div>
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Qualification criteria</h3>
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-4">
                    {/* Geography */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Geography fit</label>
                      <div className="flex gap-2">
                        {(["core","adjacent","stretch"] as GeographyFit[]).map(g => (
                          <button key={g} onClick={() => update({ geographyFit: g })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                              t.geographyFit === g ? "bg-[#74A0F4] text-white border-[#74A0F4]" : "border-[#E5E7EB] text-[#6B7280]"
                            }`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Strategy */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Integration strategy</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["full","partial","bolt-on","standalone"] as IntegrationStrategy[]).map(s => (
                          <button key={s} onClick={() => update({ strategyFit: s })}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                              t.strategyFit === s ? "bg-[#FF6400] text-white border-[#FF6400]" : "border-[#E5E7EB] text-[#6B7280]"
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Professionalization */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Professionalization</label>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => update({ professionalization: n as 1|2|3|4|5 })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              t.professionalization === n ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280]"
                            }`}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] mt-1">1 = family business · 5 = institutional</p>
                    </div>
                    {/* Priority */}
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Priority</label>
                      <div className="flex gap-2">
                        {(["high","medium","low"] as Priority[]).map(p => (
                          <button key={p} onClick={() => update({ priority: p })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                              t.priority === p ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280]"
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Contacts ── */}
          {tab === "contacts" && (
            <div className="max-w-2xl space-y-4">
              {t.contacts.map(cp => (
                <div key={cp.id} className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-[#9CA3AF]">{cp.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#242C2D]">{cp.name}</p>
                    <p className="text-[11px] text-[#9CA3AF]">{cp.role}</p>
                    {cp.email && <p className="text-[11px] font-mono text-[#6B7280]">{cp.email}</p>}
                  </div>
                  <button onClick={() => removeContact(cp.id)} className="text-[#D1D5DB] hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}

              {showAddContact ? (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={cpName} onChange={e => setCpName(e.target.value)} placeholder="Name *"
                      className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                    <input value={cpRole} onChange={e => setCpRole(e.target.value)} placeholder="Role"
                      className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  </div>
                  <input value={cpEmail} onChange={e => setCpEmail(e.target.value)} placeholder="Email"
                    className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  <div className="flex gap-2">
                    <button onClick={addContact} className="flex-1 sf-gradient text-white text-xs font-medium py-2 rounded-lg hover:opacity-90">Add contact</button>
                    <button onClick={() => setShowAddContact(false)} className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB]">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddContact(true)}
                  className="w-full border border-dashed border-[#E5E7EB] rounded-xl py-3 flex items-center justify-center gap-2 text-xs text-[#9CA3AF] hover:border-[#FF6400]/30 hover:text-[#FF6400] transition-colors">
                  <Plus size={12} /> Add contact person
                </button>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          {tab === "timeline" && (
            <div className="max-w-2xl space-y-4">
              {/* Add entry */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                <div className="flex gap-2">
                  {(["call","email","meeting","note"] as ContactType[]).map(tp => (
                    <button key={tp} onClick={() => setLogType(tp)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium border capitalize transition-colors ${
                        logType === tp ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#374151]/30"
                      }`}>
                      {contactTypeIcon[tp]} {tp}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                    className="border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#374151] focus:outline-none focus:border-[#FF6400]/40" />
                  <input value={logSummary} onChange={e => setLogSummary(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addLogEntry()}
                    placeholder="What happened?"
                    className="flex-1 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  <button onClick={addLogEntry} className="sf-gradient text-white text-xs font-medium px-3 py-2 rounded-lg hover:opacity-90 shrink-0">
                    Log
                  </button>
                </div>
              </div>

              {/* Log entries */}
              {t.contactLog.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
                  <p className="text-sm text-[#9CA3AF]">No interactions logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {t.contactLog.map(entry => (
                    <div key={entry.id} className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-start gap-3">
                      <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full shrink-0 capitalize ${contactTypeColor[entry.type]}`}>
                        {contactTypeIcon[entry.type]} {entry.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#242C2D]">{entry.summary}</p>
                      </div>
                      <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0 mt-0.5">{entry.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Documents ── */}
          {tab === "documents" && (
            <div className="max-w-3xl">
              {/* Add document form */}
              {showAddDoc ? (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6 space-y-4">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Add document</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Title *"
                      className="col-span-2 border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  </div>
                  {/* Type selector */}
                  <div className="flex flex-wrap gap-2">
                    {(["link","note","pdf","excel","word","presentation","contract","financial","other"] as DocType[]).map(tp => (
                      <button key={tp} type="button" onClick={() => setDocType(tp)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                          docType === tp ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#374151]/30"
                        }`}>
                        {DOC_ICONS[tp]} {tp}
                      </button>
                    ))}
                  </div>
                  {docType === "link" && (
                    <input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="URL (Google Drive, SharePoint, Dropbox…)"
                      className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  )}
                  {docType === "note" && (
                    <textarea value={docContent} onChange={e => setDocContent(e.target.value)} rows={5}
                      placeholder="Paste or type note content…"
                      className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-[#FF6400]/40 resize-none placeholder:text-[#D1D5DB]" />
                  )}
                  {docType !== "note" && docType !== "link" && (
                    <input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="URL or file path (optional)"
                      className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Stage context</label>
                      <select value={docStage} onChange={e => setDocStage(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-[#FF6400]/40">
                        <option value="">Any</option>
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Department</label>
                      <select value={docWs} onChange={e => setDocWs(e.target.value)}
                        className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-[#FF6400]/40">
                        <option value="">Any</option>
                        {Object.entries(CRM_DEPTS).map(([id, d]) => <option key={id} value={id}>{d.icon} {d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <textarea value={docNotes} onChange={e => setDocNotes(e.target.value)} rows={2}
                    placeholder="Internal notes (optional)"
                    className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#FF6400]/40 resize-none placeholder:text-[#D1D5DB]" />
                  <div className="flex gap-2">
                    <button onClick={addDocument} className="flex-1 sf-gradient text-white text-xs font-medium py-2 rounded-lg hover:opacity-90">Add document</button>
                    <button onClick={() => setShowAddDoc(false)} className="px-3 py-2 border border-[#E5E7EB] rounded-lg text-xs text-[#6B7280] hover:bg-[#F9FAFB]">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddDoc(true)}
                  className="w-full border border-dashed border-[#E5E7EB] rounded-xl py-3 flex items-center justify-center gap-2 text-xs text-[#9CA3AF] hover:border-[#FF6400]/30 hover:text-[#FF6400] transition-colors mb-6">
                  <Plus size={12} /> Add document or link
                </button>
              )}

              {/* Document list */}
              {(t.documents ?? []).length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
                  <UploadCloud size={24} className="text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-sm text-[#9CA3AF]">No documents yet.</p>
                  <p className="text-[11px] text-[#D1D5DB] mt-1">Add links, notes, or references to due diligence materials.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(t.documents ?? []).map(doc => (
                    <DocRow key={doc.id} doc={doc} onRemove={() => removeDocument(doc.id)} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>{/* end scrollable content */}

        {/* CRM Task AI sidebar */}
        {activeCrmTask && (
          <CRMTaskAISidebar
            key={activeCrmTask.id}
            task={activeCrmTask}
            company={t}
            onClose={() => setActiveCrmTask(null)}
          />
        )}
        </div>{/* end flex content+sidebar */}
      </div>
    </div>
  );
}
