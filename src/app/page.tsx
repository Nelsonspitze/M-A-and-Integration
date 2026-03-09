"use client";

import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { loadDemo, isDemoLoaded } from "@/lib/demo";
import { scoreForDeal, medal, PersonScore, DeptScore } from "@/lib/scoring";
import { getTargets, STAGES, stageIndex } from "@/lib/crm/store";
import type { TargetCompany } from "@/lib/crm/types";
import { getPlan } from "@/lib/pmi/plan";
import { SynergyCategory, SYNERGY_COLORS } from "@/lib/pmi/plan";
import { getUser, canSeePlanning, resolvePermissions } from "@/lib/auth";
import { getGrants } from "@/lib/vdr/grants";
import { ArrowRight, Zap, Trophy, TrendingUp, AlertTriangle, Users, Target, FolderOpen } from "lucide-react";

function getProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  return Math.round((deal.tasks.filter(t => t.completed).length / deal.tasks.length) * 100);
}

function getDays(closeDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(closeDate).getTime()) / 86400000));
}

function health(progress: number) {
  if (progress === 0)  return { label: "Starting", dot: "bg-[#9CA3AF]", text: "text-[#6B7280]", bg: "bg-[#F3F4F6]" };
  if (progress >= 70)  return { label: "On track",  dot: "bg-[#9AC183]", text: "text-[#374151]", bg: "bg-[#9AC183]/20" };
  if (progress >= 40)  return { label: "At risk",   dot: "bg-[#FCDCA0]", text: "text-[#374151]", bg: "bg-[#FCDCA0]/60" };
  return                      { label: "Critical",  dot: "bg-[#FF6400]", text: "text-[#FF6400]", bg: "bg-[#FFEFE5]" };
}

const strategyTag: Record<string, string> = {
  full: "bg-[#FFEFE5] text-[#FF6400]",
  partial: "bg-[#74A0F4]/20 text-[#374151]",
  "bolt-on": "bg-[#FCDCA0] text-[#374151]",
  standalone: "bg-[#C7CFDC]/40 text-[#374151]",
};

const wsColors = ["#FF6400","#74A0F4","#9AC183","#CDADFC","#FCDCA0","#D6FCAD","#C7CFDC","#FFF03C"];

// ── Aggregated leaderboard across all deals ──────────────────────────────────

interface AggPerson {
  id: string; name: string; initials: string; color: string; role: string;
  assigned: number; completed: number; overdue: number; points: number;
}

interface AggDept {
  wsId: string; name: string; icon: string;
  total: number; completed: number; overdue: number; points: number;
}

function buildLeaderboards(deals: Deal[]): { people: AggPerson[]; depts: AggDept[] } {
  const peopleMap = new Map<string, AggPerson>();
  const deptMap = new Map<string, AggDept>();

  for (const deal of deals) {
    const { personScores, deptScores } = scoreForDeal(deal);
    for (const ps of personScores) {
      const existing = peopleMap.get(ps.member.id);
      if (existing) {
        existing.assigned  += ps.assigned;
        existing.completed += ps.completed;
        existing.overdue   += ps.overdue;
        existing.points    += ps.points;
      } else {
        peopleMap.set(ps.member.id, { ...ps.member, assigned: ps.assigned, completed: ps.completed, overdue: ps.overdue, points: ps.points });
      }
    }
    for (const ds of deptScores) {
      const existing = deptMap.get(ds.wsId);
      if (existing) {
        existing.total     += ds.total;
        existing.completed += ds.completed;
        existing.overdue   += ds.overdue;
        existing.points    += ds.points;
      } else {
        deptMap.set(ds.wsId, { ...ds });
      }
    }
  }

  return {
    people: [...peopleMap.values()].sort((a, b) => b.points - a.points),
    depts:  [...deptMap.values()].sort((a, b) => b.points - a.points),
  };
}

// ── Pipeline funnel ──────────────────────────────────────────────────────────

function PipelineFunnel() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const targets = getTargets();
    const map: Record<string, number> = {};
    for (const t of targets) {
      map[t.stage] = (map[t.stage] ?? 0) + 1;
    }
    setCounts(map);
  }, []);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const max = Math.max(...STAGES.map(s => counts[s.id] ?? 0), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">M&A Pipeline</p>
          <p className="text-sm font-medium text-[#242C2D] mt-0.5">{total} target{total !== 1 ? "s" : ""} in pipeline</p>
        </div>
        <Link href="/crm" className="text-[11px] font-mono text-[#9CA3AF] hover:text-[#FF6400] transition-colors flex items-center gap-1">
          View all <ArrowRight size={10} />
        </Link>
      </div>

      <div className="flex items-end gap-1">
        {STAGES.map((stage, i) => {
          const count = counts[stage.id] ?? 0;
          const pct = Math.round((count / max) * 100);
          return (
            <Link key={stage.id} href="/crm" className="flex-1 group">
              <div className="flex flex-col items-center gap-1.5">
                {/* Bar */}
                <div className="w-full relative h-16 flex items-end">
                  <div
                    className="w-full rounded-t-md transition-all group-hover:opacity-80"
                    style={{
                      height: count === 0 ? "4px" : `${Math.max(pct, 10)}%`,
                      backgroundColor: count === 0 ? "#F3F4F6" : stage.color,
                      opacity: count === 0 ? 0.3 : 1,
                    }}
                  />
                </div>
                {/* Count */}
                <span className="text-[11px] font-mono font-semibold" style={{ color: count > 0 ? stage.color : "#D1D5DB" }}>
                  {count}
                </span>
                {/* Label */}
                <span className="text-[9px] font-mono text-[#9CA3AF] text-center leading-tight truncate w-full text-center">
                  {stage.label.replace(" → PMI", "")}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard({ deals }: { deals: Deal[] }) {
  const [tab, setTab] = useState<"people" | "depts">("people");
  const { people, depts } = buildLeaderboards(deals);

  if (people.length === 0 && depts.length === 0) return null;

  const maxPoints = tab === "people"
    ? Math.max(...people.map(p => p.points), 1)
    : Math.max(...depts.map(d => d.points), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-[#D4B800]" />
          <p className="text-sm font-medium text-[#242C2D]">Leaderboard</p>
        </div>
        <div className="flex gap-1 p-0.5 bg-[#F3F4F6] rounded-lg">
          {(["people", "depts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                tab === t ? "bg-white text-[#242C2D] shadow-sm" : "text-[#9CA3AF] hover:text-[#374151]"
              }`}>
              {t === "people" ? "People" : "Departments"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {(tab === "people" ? people : depts).slice(0, 6).map((entry, i) => {
          const isPerson = tab === "people";
          const p = entry as AggPerson;
          const d = entry as AggDept;
          const pct = Math.round((entry.points / maxPoints) * 100);
          const denominator = isPerson ? p.assigned : d.total;
          const completion = denominator > 0
            ? Math.round((entry.completed / denominator) * 100)
            : 0;

          return (
            <div key={isPerson ? p.id : d.wsId} className="flex items-center gap-3">
              {/* Rank */}
              <span className="w-6 text-center text-sm shrink-0">{medal(i)}</span>

              {/* Avatar */}
              {isPerson ? (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${p.color}`}>
                  <span className="text-[10px] font-medium text-white">{p.initials}</span>
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0 text-sm">
                  {d.icon}
                </div>
              )}

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-[#242C2D] truncate">
                    {isPerson ? p.name : d.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {entry.overdue > 0 && (
                      <span className="text-[9px] font-mono text-[#FF6400]">⚠ {entry.overdue}</span>
                    )}
                    <span className="text-[11px] font-mono font-semibold text-[#374151]">{entry.points}pt</span>
                  </div>
                </div>
                <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-1 rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: i === 0 ? "#D4B800" : i === 1 ? "#9CA3AF" : i === 2 ? "#CD853F" : "#74A0F4" }} />
                </div>
                <p className="text-[10px] font-mono text-[#9CA3AF] mt-0.5">
                  {entry.completed}/{denominator} tasks · {completion}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Synergies widget ─────────────────────────────────────────────────────────

const SYNERGY_CATS: SynergyCategory[] = ["revenue", "cost", "capability", "market"];

function SynergiesWidget({ deals }: { deals: Deal[] }) {
  const user = getUser();
  if (!canSeePlanning(user)) return null;

  const allSynergies = deals.flatMap(d => getPlan(d.id)?.synergyMap ?? []);
  if (allSynergies.length === 0) return null;

  const totalValue = allSynergies.reduce((a, s) => a + (s.estimatedValue ?? 0), 0);
  const byCat = SYNERGY_CATS.map(cat => ({
    cat,
    count: allSynergies.filter(s => s.category === cat).length,
    value: allSynergies.filter(s => s.category === cat).reduce((a, s) => a + (s.estimatedValue ?? 0), 0),
  }));

  function fmt(v: number) {
    if (v >= 1000) return `€${(v / 1000).toFixed(1)}M`;
    return `€${v}k`;
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Synergies</p>
          <p className="text-sm font-medium text-[#242C2D] mt-0.5">
            {allSynergies.length} identified{totalValue > 0 && ` · ${fmt(totalValue)} est. value`}
          </p>
        </div>
        <Link href="/synergies" className="text-[11px] font-mono text-[#9CA3AF] hover:text-[#FF6400] transition-colors flex items-center gap-1">
          View all <ArrowRight size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {byCat.map(({ cat, count, value }) => {
          const c = SYNERGY_COLORS[cat];
          return (
            <div key={cat} className={`rounded-xl p-3 ${c.bg}`}>
              <p className={`text-[10px] font-mono uppercase ${c.text}`}>{c.label}</p>
              <p className={`text-xl font-light heading-tight mt-1 ${c.text}`}>{count}</p>
              {value > 0 && <p className={`text-[10px] font-mono mt-0.5 opacity-70 ${c.text}`}>{fmt(value)}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelineCount, setPipelineCount] = useState(0);
  const [myDataroomTargets, setMyDataroomTargets] = useState<TargetCompany[]>([]);
  const [user, setUser] = useState<ReturnType<typeof getUser> | null>(null);

  const perms = user ? resolvePermissions(user) : null;
  const isBuyer = user ? user.partyType === "buyer" : true; // default true so SSR matches initial client render

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setDeals(getDeals());
    const allTargets = getTargets();
    setPipelineCount(allTargets.length);

    // For non-buyers: find targets where they have a VDR grant
    if (u.partyType !== "buyer") {
      const minIdx = stageIndex("nda");
      const granted = allTargets.filter(t =>
        stageIndex(t.stage) >= minIdx &&
        getGrants(t.id).some(g => g.userId === u.id)
      );
      setMyDataroomTargets(granted);
    }
  }, []);

  function handleLoadDemo() {
    loadDemo();
    setDeals(getDeals());
    setPipelineCount(getTargets().length);
  }

  const totalTasksDone = deals.reduce((a, d) => a + d.tasks.filter(t => t.completed).length, 0);
  const totalTasks = deals.reduce((a, d) => a + d.tasks.length, 0);
  const totalOverdue = deals.reduce((a, d) => a + scoreForDeal(d).totalOverdue, 0);
  const activeDeals = deals.filter(d => d.planStatus !== "planning");
  const planningDeals = deals.filter(d => d.planStatus === "planning");

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Dashboard</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-2">Command centre</h1>
            <p className="text-sm text-[#6B7280]">
              {pipelineCount} targets in pipeline · {activeDeals.length} active integration{activeDeals.length !== 1 ? "s" : ""}
              {planningDeals.length > 0 && ` · ${planningDeals.length} in planning`}
            </p>
          </div>

          {/* Non-buyer: show datarooms they have access to */}
          {!isBuyer && (
            <div className="mb-8">
              {myDataroomTargets.length > 0 ? (
                <>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Your datarooms</p>
                  <div className="space-y-2 mb-6">
                    {myDataroomTargets.map(t => (
                      <Link key={t.id} href={`/dataroom/${t.id}`}
                        className="flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 hover:border-[#FF6400]/30 hover:shadow-sm transition-all group">
                        <FolderOpen size={14} className="text-[#9CA3AF] group-hover:text-[#FF6400] transition-colors shrink-0" />
                        <span className="text-sm font-medium text-[#242C2D] flex-1">{t.name}</span>
                        <ArrowRight size={12} className="text-[#D1D5DB] group-hover:text-[#FF6400] transition-colors" />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3">
                    <FolderOpen size={20} className="text-[#D1D5DB]" />
                  </div>
                  <p className="text-sm font-medium text-[#374151]">No datarooms yet</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">The deal team will grant you access when a dataroom is ready.</p>
                </div>
              )}

              {/* Workstream tasks for non-buyers */}
              {perms?.workstreams !== "none" && deals.length > 0 && (
                <Link href="/implementations">
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#FF6400]/30 hover:shadow-sm transition-all group flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Integration tasks</p>
                      <p className="text-sm font-medium text-[#242C2D] mt-0.5">
                        {totalTasksDone} of {totalTasks} tasks completed
                        {totalOverdue > 0 && <span className="text-[#FF6400] ml-2">· {totalOverdue} overdue</span>}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-[#D1D5DB] group-hover:text-[#FF6400] transition-colors" />
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Buyer-only: Stats row */}
          {isBuyer && (deals.length > 0 || pipelineCount > 0) && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: "Pipeline",
                  value: pipelineCount,
                  sub: "targets tracked",
                  icon: <Target size={14} className="text-[#74A0F4]" />,
                  href: "/crm",
                },
                {
                  label: "Integrations",
                  value: activeDeals.length,
                  sub: planningDeals.length > 0 ? `+ ${planningDeals.length} in planning` : "active",
                  icon: <TrendingUp size={14} className="text-[#9AC183]" />,
                },
                {
                  label: "Tasks done",
                  value: totalTasksDone,
                  sub: `of ${totalTasks} total`,
                  icon: <Users size={14} className="text-[#CDADFC]" />,
                },
                {
                  label: "Overdue",
                  value: totalOverdue,
                  sub: totalOverdue === 0 ? "all on track" : "need attention",
                  icon: <AlertTriangle size={14} className={totalOverdue > 0 ? "text-[#FF6400]" : "text-[#9CA3AF]"} />,
                  alert: totalOverdue > 0,
                },
              ].map(s => (
                <Link key={s.label} href={(s as { href?: string }).href ?? "#"} className={(s as { href?: string }).href ? "block" : "cursor-default"}>
                  <div className={`bg-white border rounded-xl p-4 h-full ${(s as { alert?: boolean }).alert ? "border-[#FF6400]/30 bg-[#FFEFE5]/30" : "border-[#E5E7EB]"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">{s.label}</p>
                      {s.icon}
                    </div>
                    <p className={`text-2xl font-light heading-tight ${(s as { alert?: boolean }).alert ? "text-[#FF6400]" : "text-[#242C2D]"}`}>{s.value}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">{s.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Buyer-only: Pipeline funnel */}
          {isBuyer && <PipelineFunnel />}

          {/* Synergies widget */}
          <SynergiesWidget deals={deals} />

          {/* Leaderboard */}
          {isBuyer && deals.length > 0 && <Leaderboard deals={deals} />}

          {/* Buyer-only CTA / empty state */}
          {isBuyer && deals.length === 0 && pipelineCount === 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center">
              <div className="w-14 h-14 sf-gradient rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Zap size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-light text-[#242C2D] heading-tight mb-2">Start your first integration</h2>
              <p className="text-sm text-[#6B7280] mb-8 max-w-sm mx-auto">
                Add acquisition targets to the pipeline. Once you reach Due Diligence, kick off integration planning.
              </p>
              <Link href="/crm">
                <button className="sf-gradient text-white text-sm font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  Open Pipeline <ArrowRight size={15} />
                </button>
              </Link>
              {!isDemoLoaded() && (
                <button onClick={handleLoadDemo}
                  className="mt-4 text-sm text-[#9CA3AF] hover:text-[#FF6400] transition-colors underline-offset-2 underline block mx-auto">
                  or load demo: BuildCo × Quinnect
                </button>
              )}
            </div>
          )}

          {/* Buyer: Link to integrations */}
          {isBuyer && deals.length > 0 && (
            <Link href="/implementations">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#FF6400]/30 hover:shadow-sm transition-all group flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Integrations</p>
                  <p className="text-sm font-medium text-[#242C2D] mt-0.5">
                    {activeDeals.length} active integration{activeDeals.length !== 1 ? "s" : ""}
                    {planningDeals.length > 0 && ` · ${planningDeals.length} in planning`}
                  </p>
                </div>
                <span className="text-xs text-[#FF6400] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  View all <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
