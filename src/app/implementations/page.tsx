"use client";

import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import Link from "next/link";
import { INTEGRATION_STRATEGIES, PMI_LIBRARY } from "@/lib/pmi/library";
import { Sidebar } from "@/components/sidebar";
import { scoreForDeal } from "@/lib/scoring";
import { getUser, canSeeAllWorkstreams } from "@/lib/auth";
import { ArrowRight, Calendar, Lock } from "lucide-react";

const wsColors = ["#FF6400","#74A0F4","#9AC183","#CDADFC","#FCDCA0","#D6FCAD","#C7CFDC","#FFF03C"];

const strategyTag: Record<string, string> = {
  full: "bg-[#FFEFE5] text-[#FF6400]",
  partial: "bg-[#74A0F4]/20 text-[#374151]",
  "bolt-on": "bg-[#FCDCA0] text-[#374151]",
  standalone: "bg-[#C7CFDC]/40 text-[#374151]",
};

function getProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  return Math.round((deal.tasks.filter(t => t.completed).length / deal.tasks.length) * 100);
}

function getDays(closeDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(closeDate).getTime()) / 86400000));
}

function health(score: number) {
  if (score === 0)  return { label: "Starting", color: "#9CA3AF" };
  if (score >= 70)  return { label: "On track",  color: "#9AC183" };
  if (score >= 40)  return { label: "At risk",   color: "#D4B800" };
  return                   { label: "Critical",  color: "#FF6400" };
}

export default function ImplementationsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const user = getUser();

  useEffect(() => {
    const all = getDeals();
    const visible = canSeeAllWorkstreams(user)
      ? all
      : all.filter(d => d.tasks.some(t => t.workstreamId === user.deptId));
    setDeals(visible);
  }, []);

  const active   = deals.filter(d => d.planStatus !== "planning");
  const planning = deals.filter(d => d.planStatus === "planning");

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Integrations</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-2">Active integrations</h1>
            <p className="text-sm text-[#6B7280]">
              {active.length} active · {planning.length} in planning
            </p>
          </div>

          {/* In planning */}
          {planning.length > 0 && (
            <div className="mb-8">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">In planning</p>
              <div className="space-y-2">
                {planning.map(deal => (
                  <Link key={deal.id} href={`/deals/${deal.id}/plan`}>
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 hover:border-[#CDADFC]/60 hover:shadow-sm transition-all group flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F0FE] text-[#7C3AED]">Planning wizard</span>
                          <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                            <Calendar size={10} /> Day {getDays(deal.closeDate)}
                          </span>
                        </div>
                        <p className="font-medium text-[#242C2D]">{deal.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{deal.platformCompany} × {deal.addOnCompany}</p>
                      </div>
                      <span className="text-xs text-[#CDADFC] opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                        Continue <ArrowRight size={11} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active */}
          {active.length === 0 && planning.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center">
              <p className="text-sm font-medium text-[#374151] mb-1">No integrations yet</p>
              <p className="text-xs text-[#9CA3AF]">Start integration planning from a deal in Due Diligence or later.</p>
              <Link href="/crm" className="mt-4 inline-block text-xs text-[#FF6400] hover:underline">Go to Pipeline →</Link>
            </div>
          ) : active.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Active</p>
              <div className="space-y-3">
                {active.map(deal => {
                  const progress    = getProgress(deal);
                  const days        = getDays(deal.closeDate);
                  const { totalOverdue, healthScore, deptScores } = scoreForDeal(deal);
                  const strategy    = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy);
                  const h           = health(healthScore);

                  return (
                    <Link key={deal.id} href={`/deals/${deal.id}`}>
                      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#FF6400]/30 hover:shadow-sm transition-all group">

                        {/* Top row */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${strategyTag[deal.overallStrategy]}`}>
                                {strategy?.label}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${h.color}20`, color: h.color }}>
                                {h.label}
                              </span>
                              <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                                <Calendar size={10} /> Day {days}
                              </span>
                              {totalOverdue > 0 && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFEFE5] text-[#FF6400]">
                                  ⚠ {totalOverdue} overdue
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-[#242C2D]">{deal.name}</h3>
                            <p className="text-xs text-[#9CA3AF]">{deal.platformCompany} × {deal.addOnCompany}</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-3xl font-light text-[#242C2D] heading-tight">{progress}%</p>
                            <p className="text-[10px] font-mono text-[#9CA3AF]">complete</p>
                          </div>
                        </div>

                        {/* Workstream bars with names */}
                        <div className="space-y-1.5 mb-3">
                          {(strategy?.activeWorkstreams ?? []).map((wsId, i) => {
                            const wsDef   = PMI_LIBRARY.find(w => w.id === wsId);
                            const ds      = deptScores.find(d => d.wsId === wsId);
                            const total   = ds?.total ?? 0;
                            const done    = ds?.completed ?? 0;
                            const pct     = total > 0 ? Math.round(done / total * 100) : 0;
                            return (
                              <div key={wsId} className="flex items-center gap-2">
                                <span className="text-[10px] w-24 shrink-0 truncate text-[#9CA3AF]">{wsDef?.name ?? wsId}</span>
                                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: `${wsColors[i % wsColors.length]}25` }}>
                                  <div className="h-1.5 rounded-full transition-all"
                                    style={{ backgroundColor: wsColors[i % wsColors.length], width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-[#9CA3AF] w-8 text-right shrink-0">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[#9CA3AF]">
                            {deal.tasks.filter(t => t.completed).length}/{deal.tasks.length} tasks · {healthScore}% on schedule
                          </p>
                          <span className="text-xs text-[#FF6400] opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            Open workbench <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
