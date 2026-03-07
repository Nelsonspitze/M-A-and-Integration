"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Deal, getDeal, saveDeal } from "@/lib/store";
import { INTEGRATION_STRATEGIES, IntegrationStrategy, PMI_LIBRARY } from "@/lib/pmi/library";
import { Sidebar } from "@/components/sidebar";
import { ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
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

function getDealProgress(d: Deal) {
  if (!d.tasks.length) return 0;
  return Math.round((d.tasks.filter(t => t.completed).length / d.tasks.length) * 100);
}

function getWsProgress(d: Deal, wsId: string) {
  const tasks = d.tasks.filter(t => t.workstreamId === wsId);
  if (!tasks.length) return null; // null = not started
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
}

function getWsStrategy(d: Deal, wsId: string): IntegrationStrategy {
  return d.workstreamConfigs.find(c => c.workstreamId === wsId)?.strategy ?? d.overallStrategy;
}

function health(progress: number | null) {
  if (progress === null) return { label: "Not started", dot: "bg-[#D1D5DB]", text: "text-[#9CA3AF]", bg: "bg-[#F3F4F6]" };
  if (progress >= 70)   return { label: "On track",    dot: "bg-[#9AC183]", text: "text-[#374151]", bg: "bg-[#9AC183]/20" };
  if (progress >= 40)   return { label: "At risk",     dot: "bg-[#FCDCA0]", text: "text-[#374151]", bg: "bg-[#FCDCA0]/60" };
  if (progress > 0)     return { label: "Critical",    dot: "bg-[#FF6400]", text: "text-[#FF6400]", bg: "bg-[#FFEFE5]" };
  return                       { label: "Not started", dot: "bg-[#D1D5DB]", text: "text-[#9CA3AF]", bg: "bg-[#F3F4F6]" };
}

function gameBadge(p: number) {
  if (p >= 100) return "🏆 Integration complete";
  if (p >= 75)  return "🚀 Final stretch";
  if (p >= 50)  return "⚡ Building momentum";
  if (p >= 25)  return "🌱 In motion";
  return "🎯 Day 1 mode";
}

export default function DealPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const d = getDeal(params.id as string);
    if (!d) { router.push("/"); return; }
    setDeal(d);
  }, [params.id, router]);

  if (!deal) return null;

  const progress = getDealProgress(deal);
  const days = Math.max(0, Math.floor((Date.now() - new Date(deal.closeDate).getTime()) / 86400000));
  const strategy = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy);
  const activeWorkstreams = PMI_LIBRARY.filter(ws => strategy?.activeWorkstreams.includes(ws.id));
  const atRisk = activeWorkstreams.filter(ws => {
    const p = getWsProgress(deal, ws.id);
    return p !== null && p < 40;
  }).length;

  // Prompt to generate first AI plan if deal is fresh
  const hasAnyPlan = Object.keys(deal.actionPlans).length > 0;

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 pt-12 pb-20">

          {/* Deal header */}
          <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Integration</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-1">{deal.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[#6B7280]">{deal.platformCompany} × {deal.addOnCompany}</span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">{strategy?.label}</span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">Day {days} post-close</span>
            </div>
          </div>

          {/* Progress card */}
          <div className="bg-[#242C2D] rounded-2xl p-6 mb-8">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-white/40 mb-2">Integration progress</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-light text-white heading-tight">{progress}%</span>
                  <span className="text-white/40 text-sm mb-1.5">{gameBadge(progress)}</span>
                </div>
              </div>
              <div className="flex gap-6 text-right">
                {[
                  { v: deal.tasks.filter(t => t.completed).length, l: "done" },
                  { v: deal.tasks.length - deal.tasks.filter(t => t.completed).length, l: "remaining" },
                  { v: atRisk, l: "at risk", warn: atRisk > 0 },
                ].map(s => (
                  <div key={s.l}>
                    <p className={`text-2xl font-light heading-tight ${s.warn ? "text-[#FF6400]" : "text-white"}`}>{s.v}</p>
                    <p className="text-[10px] font-mono text-white/40">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-1.5 rounded-full transition-all bg-[#FF6400]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* First-time AI nudge */}
          {!hasAnyPlan && (
            <div className="bg-[#FFEFE5] border border-[#FFD4B8] rounded-xl p-4 mb-6 flex items-start gap-3">
              <Sparkles size={16} className="text-[#FF6400] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#242C2D] mb-1">Generate your first AI action plans</p>
                <p className="text-xs text-[#6B7280]">
                  Open any workstream below and click &quot;Generate Plan&quot; — Claude will create a tailored action plan based on your deal context and integration strategy.
                </p>
              </div>
            </div>
          )}

          {/* Workstream grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-[#242C2D]">Workstreams</h2>
              <p className="text-xs text-[#9CA3AF]">
                {activeWorkstreams.length} active for {strategy?.label}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeWorkstreams.map(ws => {
                const wsProgress = getWsProgress(deal, ws.id);
                const wsHealth = health(wsProgress);
                const wsStrategy = getWsStrategy(deal, ws.id);
                const overridden = wsStrategy !== deal.overallStrategy;
                const colors = wsColors[ws.id] ?? wsColors.day1;
                const itemCount = ws.items.filter(i => i.strategies.includes(wsStrategy)).length;
                const taskCount = deal.tasks.filter(t => t.workstreamId === ws.id).length;
                const hasPlan = ws.items.some(i => deal.actionPlans[i.id]);

                return (
                  <Link key={ws.id} href={`/deals/${deal.id}/workstreams/${ws.id}`}>
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#FF6400]/30 hover:shadow-sm transition-all cursor-pointer group h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: colors.light }}>
                            {ws.icon}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-[#242C2D]">{ws.name}</p>
                            {overridden && (
                              <p className="text-[10px] font-mono text-[#FF6400]">Strategy overridden</p>
                            )}
                          </div>
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full shrink-0 ${wsHealth.bg} ${wsHealth.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${wsHealth.dot}`} />
                          {wsHealth.label}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-[#9CA3AF]">Progress</span>
                          <span className="text-sm font-medium text-[#242C2D]">{wsProgress ?? 0}%</span>
                        </div>
                        <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ backgroundColor: colors.dot, width: `${wsProgress ?? 0}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          <span className="text-[10px] text-[#9CA3AF]">{itemCount} items</span>
                          {taskCount > 0 && <span className="text-[10px] text-[#9CA3AF]">{taskCount} tasks</span>}
                          {hasPlan && (
                            <span className="text-[10px] text-[#CDADFC] flex items-center gap-0.5">
                              <Sparkles size={9} /> AI plan
                            </span>
                          )}
                        </div>
                        <span className="text-[#FF6400] opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight size={14} />
                        </span>
                      </div>

                      {wsProgress === null && (
                        <p className="text-[10px] text-[#9CA3AF] mt-2 flex items-center gap-1">
                          <AlertTriangle size={10} /> No tasks yet — open to get started
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
