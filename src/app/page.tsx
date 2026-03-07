"use client";

import { useEffect, useState } from "react";
import { Deal, getDeals } from "@/lib/store";
import Link from "next/link";
import { INTEGRATION_STRATEGIES } from "@/lib/pmi/library";
import { Sidebar } from "@/components/sidebar";
import { loadDemo, isDemoLoaded } from "@/lib/demo";
import { ArrowRight, Calendar, Zap } from "lucide-react";

function getProgress(deal: Deal) {
  if (!deal.tasks.length) return 0;
  return Math.round((deal.tasks.filter(t => t.completed).length / deal.tasks.length) * 100);
}

function getDays(closeDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(closeDate).getTime()) / 86400000));
}

function health(progress: number) {
  if (progress === 0)  return { label: "Starting",  dot: "bg-[#9CA3AF]",   text: "text-[#6B7280]",   bg: "bg-[#F3F4F6]" };
  if (progress >= 70)  return { label: "On track",  dot: "bg-[#9AC183]",   text: "text-[#374151]",   bg: "bg-[#9AC183]/20" };
  if (progress >= 40)  return { label: "At risk",   dot: "bg-[#FCDCA0]",   text: "text-[#374151]",   bg: "bg-[#FCDCA0]/60" };
  return                      { label: "Critical",  dot: "bg-[#FF6400]",   text: "text-[#FF6400]",   bg: "bg-[#FFEFE5]" };
}

const strategyTag: Record<string, string> = {
  full: "bg-[#FFEFE5] text-[#FF6400]",
  partial: "bg-[#74A0F4]/20 text-[#374151]",
  "bolt-on": "bg-[#FCDCA0] text-[#374151]",
  standalone: "bg-[#C7CFDC]/40 text-[#374151]",
};

const wsColors = ["#FF6400","#74A0F4","#9AC183","#CDADFC","#FCDCA0","#D6FCAD","#C7CFDC","#FFF03C"];

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  useEffect(() => { setDeals(getDeals()); }, []);

  function handleLoadDemo() {
    loadDemo();
    setDeals(getDeals());
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="mb-10">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Dashboard</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-2">Your integrations</h1>
            <p className="text-sm text-[#6B7280]">
              {deals.length === 0
                ? "No active integrations yet."
                : `${deals.length} integration${deals.length > 1 ? "s" : ""} in progress.`}
            </p>
          </div>

          {/* Summary row — only when deals exist */}
          {deals.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { label: "Active deals",  value: deals.length,
                  sub: "integrations running" },
                { label: "Avg. progress", value: `${Math.round(deals.reduce((a,d) => a + getProgress(d), 0) / deals.length)}%`,
                  sub: "across all deals" },
                { label: "Tasks done",    value: deals.reduce((a,d) => a + d.tasks.filter(t => t.completed).length, 0),
                  sub: `of ${deals.reduce((a,d) => a + d.tasks.length, 0)} total` },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">{s.label}</p>
                  <p className="text-3xl font-light text-[#242C2D] heading-tight">{s.value}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {deals.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center">
              <div className="w-14 h-14 sf-gradient rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Zap size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-light text-[#242C2D] heading-tight mb-2">Start your first integration</h2>
              <p className="text-sm text-[#6B7280] mb-8 max-w-sm mx-auto">
                Create a deal, set your integration strategy, and let AI help you build a tailored PMI action plan.
              </p>
              <Link href="/deals/new">
                <button className="sf-gradient text-white text-sm font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                  New Integration <ArrowRight size={15} />
                </button>
              </Link>
              {!isDemoLoaded() && (
                <button onClick={handleLoadDemo}
                  className="mt-4 text-sm text-[#9CA3AF] hover:text-[#FF6400] transition-colors underline-offset-2 underline block mx-auto">
                  or load demo: BuildCo × Quinnect
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => {
                const progress = getProgress(deal);
                const days = getDays(deal.closeDate);
                const h = health(progress);
                const strategy = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy);

                return (
                  <Link key={deal.id} href={`/deals/${deal.id}`}>
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 hover:border-[#FF6400]/30 hover:shadow-sm transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${strategyTag[deal.overallStrategy]}`}>
                              {strategy?.label}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${h.bg} ${h.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />{h.label}
                            </span>
                            <span className="text-[10px] font-mono text-[#9CA3AF] flex items-center gap-1">
                              <Calendar size={10} /> Day {days}
                            </span>
                          </div>
                          <h3 className="font-medium text-[#242C2D]">{deal.name}</h3>
                          <p className="text-xs text-[#9CA3AF] mt-0.5">{deal.platformCompany} × {deal.addOnCompany}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-light text-[#242C2D] heading-tight">{progress}%</p>
                          <p className="text-[10px] font-mono text-[#9CA3AF]">complete</p>
                        </div>
                      </div>

                      {/* Per-workstream mini bars */}
                      <div className="flex gap-1 mb-3">
                        {(strategy?.activeWorkstreams ?? []).map((ws, i) => {
                          const wsTasks = deal.tasks.filter(t => t.workstreamId === ws);
                          const wsProgress = wsTasks.length ? Math.round(wsTasks.filter(t => t.completed).length / wsTasks.length * 100) : 0;
                          return (
                            <div key={ws} className="flex-1 h-1 rounded-full" style={{ backgroundColor: `${wsColors[i % wsColors.length]}30` }}>
                              <div className="h-1 rounded-full transition-all" style={{ backgroundColor: wsColors[i % wsColors.length], width: `${wsProgress}%` }} />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#9CA3AF]">
                          {deal.tasks.filter(t => t.completed).length}/{deal.tasks.length} tasks ·{" "}
                          {deal.workstreamConfigs.length} workstreams configured
                        </p>
                        <span className="text-xs text-[#FF6400] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Open workbench <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
