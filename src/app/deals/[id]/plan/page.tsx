"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDeal, saveDeal } from "@/lib/store";
import { getPlan, createPlan, savePlan, DealPlan, SynergyItem, SynergyCategory, WorkstreamDecision, PhaseMilestone, PhaseKey, PHASE_LABELS, SYNERGY_COLORS } from "@/lib/pmi/plan";
import { INTEGRATION_STRATEGIES, PMI_LIBRARY, IntegrationStrategy } from "@/lib/pmi/library";
import { getUser, canSeePlanning, canSeeOrgSensitivity } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Sparkles, ChevronRight, Check, Plus, X, Lock, AlertTriangle, Loader2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Rationale", "Synergies", "Workstreams", "Timeline", "Org & Sensitivity"];
const STRATEGY_OPTIONS: { value: IntegrationStrategy; label: string; desc: string }[] = [
  { value: "full",       label: "Full Integration",  desc: "Fully merge into platform" },
  { value: "partial",    label: "Partial",            desc: "Shared systems, separate teams" },
  { value: "bolt-on",    label: "Bolt-on",            desc: "Light touch, keep identity" },
  { value: "standalone", label: "Standalone",         desc: "Operate independently" },
];

function useStream() {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);

  async function stream(step: string, deal: unknown, plan: unknown, onChunk?: (t: string) => void) {
    setText("");
    setLoading(true);
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Generate the content as instructed." }],
          planContext: { step, deal, plan },
        }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setText(full);
        onChunk?.(full);
      }
    } finally { setLoading(false); }
    return full;
  }

  return { text, loading, stream, setText };
}

// ── AI Assist Button ──────────────────────────────────────────────────────────

function AIButton({ onClick, loading, label = "Generate with AI" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg sf-gradient text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
      {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
      {loading ? "Generating…" : label}
    </button>
  );
}

// ── Step 1: Rationale ─────────────────────────────────────────────────────────

function StepRationale({ deal, plan, onChange }: { deal: ReturnType<typeof getDeal>; plan: DealPlan; onChange: (p: Partial<DealPlan>) => void }) {
  const { loading, stream } = useStream();

  async function generate() {
    await stream("rationale", deal, plan, t => onChange({ dealRationale: t }));
  }

  return (
    <div className="space-y-6">
      {/* Deal overview chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Platform", value: deal!.platformCompany },
          { label: "Add-on", value: deal!.addOnCompany },
          { label: "Strategy", value: INTEGRATION_STRATEGIES.find(s => s.value === deal!.overallStrategy)?.label ?? deal!.overallStrategy },
          { label: "Close date", value: deal!.closeDate },
        ].map(chip => (
          <div key={chip.label} className="flex items-center gap-1.5 bg-[#F3F4F6] rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-widest">{chip.label}</span>
            <span className="text-xs font-medium text-[#374151]">{chip.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">
            Strategic rationale
          </label>
          <AIButton onClick={generate} loading={loading} />
        </div>
        <textarea
          value={plan.dealRationale}
          onChange={e => onChange({ dealRationale: e.target.value })}
          rows={12}
          placeholder="Why are we making this acquisition? What does it add to our platform? What synergies do we expect, and why now?"
          className="w-full text-sm text-[#374151] border border-[#E5E7EB] rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-[#FF6400]/40 leading-relaxed placeholder:text-[#D1D5DB]"
        />
        <p className="text-[10px] text-[#9CA3AF] mt-1.5">This rationale will be shared with C-level and department leads as context for the integration.</p>
      </div>

      {deal!.dealBrief && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Deal brief (source)</p>
          <p className="text-xs text-[#6B7280] leading-relaxed">{deal!.dealBrief}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Synergy Map ───────────────────────────────────────────────────────

function StepSynergies({ deal, plan, onChange }: { deal: ReturnType<typeof getDeal>; plan: DealPlan; onChange: (p: Partial<DealPlan>) => void }) {
  const { loading, stream } = useStream();
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SynergyItem>>({ category: "revenue" });

  async function generate() {
    const text = await stream("synergies", deal, plan);
    // Parse AI output into structured items
    const lines = text.split("\n").filter(l => l.trim());
    const items: SynergyItem[] = [];
    let current: Partial<SynergyItem> | null = null;
    for (const line of lines) {
      const boldMatch = line.match(/\*\*\[?(Revenue|Cost|Capability|Market)\]?\*?\*?\s*[—-]\s*(.+)/i);
      if (boldMatch) {
        if (current?.title) items.push({ id: crypto.randomUUID(), category: "revenue", description: "", ...current } as SynergyItem);
        current = {
          category: boldMatch[1].toLowerCase() as SynergyCategory,
          title: boldMatch[2].trim(),
          description: "",
        };
      } else if (current && line.trim() && !line.startsWith("**")) {
        current.description = (current.description ?? "") + (current.description ? " " : "") + line.replace(/^[-•]\s*/, "").trim();
      }
    }
    if (current?.title) items.push({ id: crypto.randomUUID(), category: "revenue", description: "", ...current } as SynergyItem);
    if (items.length > 0) onChange({ synergyMap: [...(plan.synergyMap ?? []), ...items] });
  }

  function addItem() {
    if (!newItem.title) return;
    const item: SynergyItem = {
      id: crypto.randomUUID(),
      category: newItem.category as SynergyCategory ?? "revenue",
      title: newItem.title,
      description: newItem.description ?? "",
      estimatedValue: newItem.estimatedValue,
      timeline: newItem.timeline,
    };
    onChange({ synergyMap: [...plan.synergyMap, item] });
    setNewItem({ category: "revenue" });
    setAdding(false);
  }

  function removeItem(id: string) {
    onChange({ synergyMap: plan.synergyMap.filter(s => s.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280]">Map the value this deal creates. AI will draft based on your deal context.</p>
        <div className="flex items-center gap-2">
          <AIButton onClick={generate} loading={loading} label="Generate synergy map" />
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors">
            <Plus size={11} /> Add synergy
          </button>
        </div>
      </div>

      {plan.synergyMap.length === 0 && !adding && (
        <div className="border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <p className="text-sm text-[#9CA3AF]">No synergies mapped yet.</p>
          <p className="text-xs text-[#D1D5DB] mt-1">Use AI to generate a starting map, or add manually.</p>
        </div>
      )}

      <div className="space-y-2">
        {plan.synergyMap.map(item => {
          const cat = SYNERGY_COLORS[item.category];
          return (
            <div key={item.id} className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-start gap-3 group">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${cat.bg} ${cat.text}`}>{cat.label}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#242C2D]">{item.title}</p>
                {item.description && <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{item.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  {item.estimatedValue && <span className="text-[10px] font-mono text-[#9AC183]">€{item.estimatedValue}k</span>}
                  {item.timeline && <span className="text-[10px] text-[#9CA3AF]">{item.timeline}</span>}
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#EF4444] transition-all shrink-0">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Category</label>
              <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value as SynergyCategory })}
                className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#FF6400]/40">
                {(["revenue","cost","capability","market"] as SynergyCategory[]).map(c => (
                  <option key={c} value={c}>{SYNERGY_COLORS[c].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Est. value (€k)</label>
              <input type="number" placeholder="e.g. 320" value={newItem.estimatedValue ?? ""}
                onChange={e => setNewItem({ ...newItem, estimatedValue: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Title</label>
            <input value={newItem.title ?? ""} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
              placeholder="e.g. Cross-sell Quinnect digital services into BuildCo client base"
              className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Description</label>
            <textarea value={newItem.description ?? ""} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              rows={2} placeholder="Brief explanation of this synergy"
              className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-xl px-2.5 py-2 resize-none focus:outline-none focus:border-[#FF6400]/40" />
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="sf-gradient text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90">Add</button>
            <button onClick={() => { setAdding(false); setNewItem({ category: "revenue" }); }}
              className="text-xs text-[#9CA3AF] hover:text-[#374151] px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Workstream Decisions ──────────────────────────────────────────────

function StepWorkstreams({ deal, plan, onChange }: { deal: ReturnType<typeof getDeal>; plan: DealPlan; onChange: (p: Partial<DealPlan>) => void }) {
  const { loading, stream } = useStream();
  const strategy = INTEGRATION_STRATEGIES.find(s => s.value === deal!.overallStrategy);
  const activeWs = PMI_LIBRARY.filter(ws => strategy?.activeWorkstreams.includes(ws.id));

  function getDecision(wsId: string): WorkstreamDecision {
    return plan.workstreamDecisions.find(d => d.workstreamId === wsId) ?? {
      workstreamId: wsId, strategy: deal!.overallStrategy, rationale: "", keyRisks: "", owner: "",
    };
  }

  function updateDecision(d: WorkstreamDecision) {
    const rest = plan.workstreamDecisions.filter(x => x.workstreamId !== d.workstreamId);
    onChange({ workstreamDecisions: [...rest, d] });
  }

  async function generateAll() {
    const text = await stream("workstreams", deal, plan);
    // Parse — rough: split on **[WorkstreamName]**
    const sections = text.split(/\*\*([A-Za-z\s0-9]+)\*\*\s*[—-]/);
    const decisions = [...plan.workstreamDecisions];
    for (let i = 1; i < sections.length - 1; i += 2) {
      const wsName = sections[i].trim().toLowerCase().replace(/\s+/, "");
      const content = sections[i + 1] ?? "";
      const ws = activeWs.find(w => wsName.includes(w.id) || w.name.toLowerCase().includes(wsName));
      if (!ws) continue;
      const stratMatch = content.match(/(Full Integration|Partial Integration|Bolt-on|Standalone)/i);
      const strategy = (stratMatch?.[1].toLowerCase().replace(" integration", "").replace("-", "") as IntegrationStrategy) ?? deal!.overallStrategy;
      const rationale = content.replace(/Strategy:.*\n/, "").replace(/Key risks:[\s\S]*/i, "").trim();
      const risksMatch = content.split(/Key risks?:/i);
      const risks = risksMatch.length > 1 ? risksMatch[1].split("**")[0].trim() : "";
      const idx = decisions.findIndex(d => d.workstreamId === ws.id);
      const dec: WorkstreamDecision = { workstreamId: ws.id, strategy, rationale, keyRisks: risks, owner: "" };
      if (idx >= 0) decisions[idx] = dec; else decisions.push(dec);
    }
    onChange({ workstreamDecisions: decisions });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280]">Decide integration approach per workstream. Rationale is shown to department leads.</p>
        <AIButton onClick={generateAll} loading={loading} label="Generate all decisions" />
      </div>

      <div className="space-y-3">
        {activeWs.map(ws => {
          const dec = getDecision(ws.id);
          return (
            <div key={ws.id} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E7EB] flex items-center gap-3">
                <span className="text-base">{ws.icon}</span>
                <span className="text-sm font-medium text-[#242C2D]">{ws.name}</span>
              </div>
              <div className="px-4 py-4 space-y-3">
                {/* Strategy pills */}
                <div className="flex flex-wrap gap-2">
                  {STRATEGY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => updateDecision({ ...dec, strategy: opt.value })}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                        dec.strategy === opt.value
                          ? "bg-[#242C2D] text-white border-[#242C2D]"
                          : "text-[#6B7280] border-[#E5E7EB] hover:border-[#374151] hover:text-[#374151]"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Rationale (shared with dept lead)</label>
                    <textarea value={dec.rationale} onChange={e => updateDecision({ ...dec, rationale: e.target.value })}
                      rows={3} placeholder="Why this approach for this workstream?"
                      className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Key risks (internal)</label>
                    <textarea value={dec.keyRisks} onChange={e => updateDecision({ ...dec, keyRisks: e.target.value })}
                      rows={3} placeholder="What could go wrong?"
                      className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1 block">Owner</label>
                  <input value={dec.owner} onChange={e => updateDecision({ ...dec, owner: e.target.value })}
                    placeholder="Name or role"
                    className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 4: Timeline ──────────────────────────────────────────────────────────

function StepTimeline({ deal, plan, onChange }: { deal: ReturnType<typeof getDeal>; plan: DealPlan; onChange: (p: Partial<DealPlan>) => void }) {
  const { loading, stream } = useStream();
  const [newMilestone, setNewMilestone] = useState<{ phase: PhaseKey; title: string }>({ phase: "day1", title: "" });

  const phases: PhaseKey[] = ["day1", "month1", "month3", "month6", "month12"];

  async function generate() {
    const text = await stream("timeline", deal, plan);
    const milestones: PhaseMilestone[] = [];
    let currentPhase: PhaseKey = "day1";
    for (const line of text.split("\n")) {
      if (line.includes("Day 1")) currentPhase = "day1";
      else if (line.includes("Month 1")) currentPhase = "month1";
      else if (line.includes("Month 3")) currentPhase = "month3";
      else if (line.includes("Month 6")) currentPhase = "month6";
      else if (line.includes("Month 12")) currentPhase = "month12";
      else if (line.match(/^[-•*]\s+.+/) || (line.trim().length > 10 && !line.startsWith("#") && !line.startsWith("**"))) {
        const title = line.replace(/^[-•*]\s+/, "").trim();
        if (title) milestones.push({ id: crypto.randomUUID(), phase: currentPhase, title });
      }
    }
    onChange({ milestones: [...plan.milestones, ...milestones] });
  }

  function addMilestone() {
    if (!newMilestone.title.trim()) return;
    onChange({ milestones: [...plan.milestones, { id: crypto.randomUUID(), ...newMilestone }] });
    setNewMilestone({ phase: "day1", title: "" });
  }

  function removeMilestone(id: string) {
    onChange({ milestones: plan.milestones.filter(m => m.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280]">Define what needs to happen and when. This becomes the integration roadmap.</p>
        <AIButton onClick={generate} loading={loading} label="Generate timeline" />
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <select value={newMilestone.phase} onChange={e => setNewMilestone({ ...newMilestone, phase: e.target.value as PhaseKey })}
          className="text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#FF6400]/40">
          {phases.map(p => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
        </select>
        <input value={newMilestone.title} onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
          onKeyDown={e => e.key === "Enter" && addMilestone()}
          placeholder="Add a milestone…"
          className="flex-1 text-xs text-[#374151] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB]" />
        <button onClick={addMilestone} className="sf-gradient text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90">
          <Plus size={12} />
        </button>
      </div>

      {phases.map(phase => {
        const items = plan.milestones.filter(m => m.phase === phase);
        return (
          <div key={phase} className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E5E7EB] flex items-center justify-between">
              <span className="text-xs font-medium text-[#242C2D]">{PHASE_LABELS[phase]}</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">{items.length} milestone{items.length !== 1 ? "s" : ""}</span>
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-[#D1D5DB]">No milestones yet.</p>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {items.map(m => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-2 group hover:bg-[#FAFAFA]">
                    <span className="text-[#D1D5DB] shrink-0">·</span>
                    <span className="text-xs text-[#374151] flex-1">{m.title}</span>
                    <button onClick={() => removeMilestone(m.id)} className="opacity-0 group-hover:opacity-100 text-[#9CA3AF] hover:text-[#EF4444] transition-all shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 5: Org & Sensitivity ─────────────────────────────────────────────────

function StepOrgSensitivity({ plan, onChange, canSee }: { plan: DealPlan; onChange: (p: Partial<DealPlan>) => void; canSee: boolean }) {
  if (!canSee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
          <Lock size={22} className="text-[#D1D5DB]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#374151]">Restricted access</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Org sensitivity data is only visible to M&A Admins and C-Level.</p>
        </div>
      </div>
    );
  }

  const org = plan.orgSensitivity;
  const fields: { key: keyof typeof org; label: string; placeholder: string }[] = [
    { key: "headcountImpact",  label: "Headcount impact",    placeholder: "e.g. 3-5 roles at risk in Finance and HR overlap. Decision by Month 2." },
    { key: "roleEliminations", label: "Role eliminations",   placeholder: "e.g. CFO role will be absorbed. Quinnect HR Manager role redundant." },
    { key: "salaryAlignment",  label: "Salary alignment",    placeholder: "e.g. Quinnect avg salary 12% above platform. Alignment plan needed within 6 months." },
    { key: "retentionRisk",    label: "Retention risk",      placeholder: "e.g. CTO Lena Mayer: critical, retention package being structured. 3 senior devs at risk." },
    { key: "confidentialNotes",label: "Confidential notes",  placeholder: "Any other sensitive information not to be shared with departments." },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FCA5A5]/40 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="text-[#EF4444] shrink-0" />
        <p className="text-xs text-[#EF4444]">
          <span className="font-semibold">Confidential — M&A Admin &amp; C-Level only.</span> This section is never visible to department leads or team members.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1.5 block">{f.label}</label>
            <textarea
              value={org[f.key]}
              onChange={e => onChange({ orgSensitivity: { ...org, [f.key]: e.target.value } })}
              rows={3}
              placeholder={f.placeholder}
              className="w-full text-xs text-[#374151] border border-[#E5E7EB] rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-[#FF6400]/40 placeholder:text-[#D1D5DB] leading-relaxed"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const user    = getUser();

  const [deal, setDeal]   = useState(getDeal(id));
  const [plan, setPlan]   = useState<DealPlan | null>(null);
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canSeePlanning(user)) { router.push(`/deals/${id}`); return; }
    const d = getDeal(id);
    if (!d) { router.push("/"); return; }
    setDeal(d);
    const p = getPlan(id) ?? createPlan(id);
    setPlan(p);
  }, [id]);

  function updatePlan(patch: Partial<DealPlan>) {
    if (!plan) return;
    const updated = { ...plan, ...patch };
    setPlan(updated);
    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      savePlan(updated);
      setSaving(false);
    }, 600);
  }

  async function publish() {
    if (!plan || !deal) return;
    if (!confirm("Publish this integration plan? Department leads will be able to see their workstream context.")) return;

    // Apply workstream decisions to deal configs
    const updatedDeal = {
      ...deal,
      planStatus: "active" as const,
      workstreamConfigs: plan.workstreamDecisions.map(d => ({
        workstreamId: d.workstreamId,
        strategy: d.strategy,
        owner: d.owner,
        notes: d.rationale,
      })),
    };
    saveDeal(updatedDeal);

    const publishedPlan = { ...plan, status: "published" as const, publishedAt: new Date().toISOString() };
    savePlan(publishedPlan);

    router.push(`/deals/${id}`);
  }

  if (!deal || !plan) return null;

  const steps = [
    <StepRationale   key="r" deal={deal} plan={plan} onChange={updatePlan} />,
    <StepSynergies   key="s" deal={deal} plan={plan} onChange={updatePlan} />,
    <StepWorkstreams key="w" deal={deal} plan={plan} onChange={updatePlan} />,
    <StepTimeline    key="t" deal={deal} plan={plan} onChange={updatePlan} />,
    <StepOrgSensitivity key="o" plan={plan} onChange={updatePlan} canSee={canSeeOrgSensitivity(user)} />,
  ];

  const completionFlags = [
    plan.dealRationale.length > 50,
    plan.synergyMap.length > 0,
    plan.workstreamDecisions.length > 0,
    plan.milestones.length > 0,
    true, // org sensitivity is optional
  ];

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-[#E5E7EB] px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-0.5">Integration planning</p>
            <h1 className="text-lg font-semibold text-[#242C2D]">{deal.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-[10px] font-mono text-[#9CA3AF]">Saving…</span>}
            <button onClick={() => router.push(`/deals/${id}`)}
              className="text-xs text-[#9CA3AF] hover:text-[#374151] transition-colors">
              Back to deal
            </button>
            <button onClick={publish}
              className="sf-gradient text-white text-xs font-semibold px-5 py-2 rounded-xl hover:opacity-90 flex items-center gap-2">
              <Check size={13} /> Publish plan
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Step navigator */}
          <div className="w-52 shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col py-6 px-4">
            {STEP_LABELS.map((label, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mb-1 ${
                  step === i ? "bg-[#F3F4F6]" : "hover:bg-[#FAFAFA]"
                }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  completionFlags[i]
                    ? "bg-[#9AC183]"
                    : step === i
                    ? "bg-[#FF6400]"
                    : "bg-[#E5E7EB]"
                }`}>
                  {completionFlags[i]
                    ? <Check size={10} className="text-white" />
                    : <span className="text-[9px] font-mono text-white">{i + 1}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${step === i ? "text-[#242C2D]" : "text-[#6B7280]"}`}>{label}</p>
                  {i === 4 && <span className="text-[9px] font-mono text-[#EF4444]">Confidential</span>}
                </div>
              </button>
            ))}

            {/* Progress */}
            <div className="mt-auto pt-4 border-t border-[#E5E7EB]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Completion</p>
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div className="h-full bg-[#9AC183] rounded-full transition-all"
                  style={{ width: `${Math.round(completionFlags.filter(Boolean).length / completionFlags.length * 100)}%` }} />
              </div>
              <p className="text-[10px] font-mono text-[#9CA3AF] mt-1.5">
                {completionFlags.filter(Boolean).length}/{completionFlags.length} steps
              </p>
            </div>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">Step {step + 1} of {STEP_LABELS.length}</p>
                  <h2 className="text-2xl font-light text-[#242C2D] heading-tight">{STEP_LABELS[step]}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)}
                      className="text-xs text-[#9CA3AF] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#E5E7EB] transition-colors">
                      Back
                    </button>
                  )}
                  {step < steps.length - 1 && (
                    <button onClick={() => setStep(s => s + 1)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#242C2D] text-white hover:bg-[#374151] transition-colors">
                      Next <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>

              {steps[step]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
