"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import {
  TargetCompany, Priority, GeographyFit,
} from "@/lib/crm/types";
import {
  getTargets, createTarget, saveTarget, deleteTarget,
  STAGES, stageIndex, daysInStage, qualificationScore,
} from "@/lib/crm/store";
import { IntegrationStrategy } from "@/lib/pmi/library";
import { Plus, X, Target, ChevronRight, Flag, Lock } from "lucide-react";
import { getUser, canSeeCRM } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SECTORS = [
  "Healthcare", "Business Services", "Technology", "Industrial", "Consumer",
  "Financial Services", "Construction & Real Estate", "Logistics", "Other",
];

const priorityColor: Record<Priority, string> = {
  high:   "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-[#F3F4F6] text-[#6B7280]",
};

const geoLabel: Record<GeographyFit, string> = {
  core: "Core", adjacent: "Adjacent", stretch: "Stretch",
};

function scoreColor(s: number) {
  if (s >= 70) return "text-[#9AC183]";
  if (s >= 45) return "text-[#D4B800]";
  return "text-[#9CA3AF]";
}

// ── New target form ────────────────────────────────────────────────────────────

interface NewForm {
  name: string; sector: string; country: string;
  ebitdaEst: string; fte: string;
  geographyFit: GeographyFit; strategyFit: IntegrationStrategy;
  professionalization: string; priority: Priority;
}

const EMPTY: NewForm = {
  name: "", sector: "", country: "", ebitdaEst: "", fte: "",
  geographyFit: "adjacent", strategyFit: "bolt-on",
  professionalization: "3", priority: "medium",
};

function NewTargetPanel({ onClose, onCreate }: {
  onClose: () => void; onCreate: (t: TargetCompany) => void;
}) {
  const [f, setF] = useState<NewForm>(EMPTY);

  function set(k: keyof NewForm, v: string) { setF(p => ({ ...p, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !f.sector) return;
    const t = createTarget({
      name: f.name.trim(),
      sector: f.sector,
      country: f.country,
      ebitdaEst: f.ebitdaEst ? Number(f.ebitdaEst) : undefined,
      fte: f.fte ? Number(f.fte) : undefined,
      geographyFit: f.geographyFit,
      strategyFit: f.strategyFit,
      professionalization: Number(f.professionalization) as 1|2|3|4|5,
      priority: f.priority,
    });
    onCreate(t);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[400px] bg-white h-full flex flex-col shadow-xl border-l border-[#E5E7EB]">
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">New Target</p>
            <h2 className="text-lg font-light text-[#242C2D] heading-tight mt-0.5">Add acquisition target</h2>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151]"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Company name *</label>
            <input value={f.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Acme BV" required
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Sector *</label>
              <select value={f.sector} onChange={e => set("sector", e.target.value)} required
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/50 bg-white">
                <option value="">Select…</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Country</label>
              <input value={f.country} onChange={e => set("country", e.target.value)}
                placeholder="NL" className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">EBITDA est. (€k)</label>
              <input type="number" value={f.ebitdaEst} onChange={e => set("ebitdaEst", e.target.value)}
                placeholder="500" className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">FTE</label>
              <input type="number" value={f.fte} onChange={e => set("fte", e.target.value)}
                placeholder="50" className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#242C2D] focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Geography fit</label>
            <div className="flex gap-2">
              {(["core","adjacent","stretch"] as GeographyFit[]).map(g => (
                <button key={g} type="button" onClick={() => set("geographyFit", g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    f.geographyFit === g ? "bg-[#FF6400] text-white border-[#FF6400]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6400]/30"
                  }`}>
                  {geoLabel[g]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Integration strategy</label>
            <div className="grid grid-cols-2 gap-2">
              {(["full","partial","bolt-on","standalone"] as IntegrationStrategy[]).map(s => (
                <button key={s} type="button" onClick={() => set("strategyFit", s)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    f.strategyFit === s ? "bg-[#FF6400] text-white border-[#FF6400]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#FF6400]/30"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">
              Professionalization <span className="text-[#D1D5DB]">(1 = family biz · 5 = institutional)</span>
            </label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => set("professionalization", String(n))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    Number(f.professionalization) === n ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#374151]/30"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Priority</label>
            <div className="flex gap-2">
              {(["high","medium","low"] as Priority[]).map(p => (
                <button key={p} type="button" onClick={() => set("priority", p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${
                    f.priority === p ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280] hover:border-[#374151]/30"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full sf-gradient text-white text-sm font-medium py-3 rounded-xl hover:opacity-90 transition-opacity mt-2">
            Add target
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Company card ───────────────────────────────────────────────────────────────

function CompanyCard({ t }: { t: TargetCompany }) {
  const score = qualificationScore(t);
  const days  = daysInStage(t);

  return (
    <Link href={`/crm/${t.id}`}>
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 hover:shadow-sm hover:border-[#FF6400]/40 transition-all group">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-[#242C2D] leading-tight group-hover:text-[#FF6400] transition-colors">{t.name}</p>
          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0 ${priorityColor[t.priority]}`}>
            {t.priority}
          </span>
        </div>
        <p className="text-[11px] text-[#6B7280] mb-2.5">{t.sector}{t.country ? ` · ${t.country}` : ""}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {t.ebitdaEst && (
              <span className="text-[10px] font-mono bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#374151]">
                €{t.ebitdaEst >= 1000 ? `${(t.ebitdaEst/1000).toFixed(1)}M` : `${t.ebitdaEst}k`}
              </span>
            )}
            {t.fte && (
              <span className="text-[10px] font-mono bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#374151]">
                {t.fte} FTE
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-mono font-semibold ${scoreColor(score)}`}>{score}</span>
            <span className="text-[10px] font-mono text-[#D1D5DB]">{days}d</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Kanban column ──────────────────────────────────────────────────────────────

function Column({ stage, companies }: { stage: typeof STAGES[0]; companies: TargetCompany[] }) {
  return (
    <div className="w-[230px] shrink-0 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280]">{stage.label}</span>
        <span className="ml-auto text-[10px] font-mono text-[#9CA3AF]">{companies.length}</span>
      </div>
      <div className="space-y-2 flex-1">
        {companies.map(t => <CompanyCard key={t.id} t={t} />)}
        {companies.length === 0 && (
          <div className="border border-dashed border-[#E5E7EB] rounded-xl h-20 flex items-center justify-center">
            <span className="text-[10px] text-[#D1D5DB]">empty</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [targets, setTargets] = useState<TargetCompany[]>([]);
  const [showNew, setShowNew] = useState(false);
  const user = getUser();

  function load() { setTargets(getTargets()); }
  useEffect(() => {
    load();
    window.addEventListener("crm-update", load);
    return () => window.removeEventListener("crm-update", load);
  }, []);

  if (!canSeeCRM(user)) {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-[#D1D5DB]" />
            </div>
            <p className="text-sm font-medium text-[#374151]">Pipeline access restricted</p>
            <p className="text-xs text-[#9CA3AF] mt-1">The M&A pipeline is only visible to M&A Admins.</p>
          </div>
        </main>
      </div>
    );
  }

  const byStage = (id: string) => targets.filter(t => t.stage === id);
  const totalScore = targets.length > 0
    ? Math.round(targets.reduce((s, t) => s + qualificationScore(t), 0) / targets.length)
    : null;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-8 pt-8 pb-5 border-b border-[#E5E7EB] bg-white flex items-end justify-between shrink-0">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">M&A Pipeline</p>
            <h1 className="text-3xl font-light text-[#242C2D] heading-tight">Acquisition targets</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[11px] font-mono text-[#9CA3AF]">{targets.length} targets</span>
              {totalScore !== null && (
                <span className={`text-[11px] font-mono ${scoreColor(totalScore)}`}>avg. fit {totalScore}/100</span>
              )}
            </div>
          </div>
          <button onClick={() => setShowNew(true)}
            className="sf-gradient text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus size={13} /> New target
          </button>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="flex gap-4 px-8 py-6 min-w-max">
            {STAGES.map(stage => (
              <Column key={stage.id} stage={stage} companies={byStage(stage.id)} />
            ))}
          </div>
        </div>
      </div>

      {showNew && (
        <NewTargetPanel
          onClose={() => setShowNew(false)}
          onCreate={t => { setTargets(getTargets()); setShowNew(false); }}
        />
      )}
    </div>
  );
}
