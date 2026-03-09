"use client";

import { useEffect, useState } from "react";
import { getDeals, Deal } from "@/lib/store";
import { getPlan } from "@/lib/pmi/plan";
import { SynergyItem, SynergyCategory, SYNERGY_COLORS } from "@/lib/pmi/plan";
import { Sidebar } from "@/components/sidebar";
import { getUser, canSeePlanning } from "@/lib/auth";
import { Lock, TrendingUp } from "lucide-react";
import Link from "next/link";

interface EnrichedSynergy extends SynergyItem {
  dealId: string;
  dealName: string;
}

const CATEGORIES: SynergyCategory[] = ["revenue", "cost", "capability", "market"];

export default function SynergiesPage() {
  const [synergies, setSynergies] = useState<EnrichedSynergy[]>([]);
  const [filter, setFilter] = useState<SynergyCategory | "all">("all");
  const user = getUser();

  useEffect(() => {
    const deals = getDeals();
    const all: EnrichedSynergy[] = [];
    for (const deal of deals) {
      const plan = getPlan(deal.id);
      if (!plan) continue;
      for (const s of plan.synergyMap) {
        all.push({ ...s, dealId: deal.id, dealName: deal.name });
      }
    }
    setSynergies(all);
  }, []);

  if (!canSeePlanning(user)) {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-[#D1D5DB]" />
            </div>
            <p className="text-sm font-medium text-[#374151]">Restricted</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Synergy data is visible to M&A Admins and C-Level only.</p>
          </div>
        </main>
      </div>
    );
  }

  const visible = filter === "all" ? synergies : synergies.filter(s => s.category === filter);

  // Totals by category
  const totalValue = synergies.reduce((a, s) => a + (s.estimatedValue ?? 0), 0);
  const byCategory = CATEGORIES.map(cat => {
    const items = synergies.filter(s => s.category === cat);
    const value = items.reduce((a, s) => a + (s.estimatedValue ?? 0), 0);
    return { cat, count: items.length, value };
  });

  function fmt(v: number) {
    if (v >= 1000) return `€${(v / 1000).toFixed(1)}M`;
    return `€${v}k`;
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Synergies</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-2">Synergy map</h1>
            <p className="text-sm text-[#6B7280]">
              {synergies.length} synergies identified
              {totalValue > 0 && ` · ${fmt(totalValue)} total estimated value`}
            </p>
          </div>

          {synergies.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={22} className="text-[#D1D5DB]" />
              </div>
              <p className="text-sm font-medium text-[#374151] mb-1">No synergies mapped yet</p>
              <p className="text-xs text-[#9CA3AF]">Synergies are captured during the integration planning wizard.</p>
              <Link href="/implementations" className="mt-4 inline-block text-xs text-[#FF6400] hover:underline">
                Go to Implementations →
              </Link>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {byCategory.map(({ cat, count, value }) => {
                  const c = SYNERGY_COLORS[cat];
                  return (
                    <button key={cat} onClick={() => setFilter(filter === cat ? "all" : cat)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        filter === cat
                          ? "border-[#FF6400]/40 shadow-sm bg-white"
                          : "bg-white border-[#E5E7EB] hover:border-[#FF6400]/20"
                      }`}>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                        {c.label}
                      </span>
                      <p className="text-2xl font-light text-[#242C2D] heading-tight mt-2">{count}</p>
                      <p className="text-[10px] font-mono text-[#9CA3AF]">
                        {value > 0 ? fmt(value) : "no est."}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Total value bar */}
              {totalValue > 0 && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">Value breakdown</p>
                    <p className="text-sm font-medium text-[#242C2D]">{fmt(totalValue)} total</p>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {byCategory.filter(b => b.value > 0).map(({ cat, value }) => {
                      const c = SYNERGY_COLORS[cat];
                      const pct = Math.round((value / totalValue) * 100);
                      return (
                        <div key={cat} title={`${c.label}: ${fmt(value)}`}
                          className={`h-full ${c.bg} transition-all`}
                          style={{ width: `${pct}%` }} />
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 flex-wrap">
                    {byCategory.filter(b => b.value > 0).map(({ cat, value }) => {
                      const c = SYNERGY_COLORS[cat];
                      return (
                        <span key={cat} className={`text-[10px] font-mono ${c.text}`}>
                          {c.label} {fmt(value)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Synergy list */}
              <div className="space-y-2">
                {CATEGORIES.filter(cat => filter === "all" || filter === cat).map(cat => {
                  const items = visible.filter(s => s.category === cat);
                  if (items.length === 0) return null;
                  const c = SYNERGY_COLORS[cat];
                  return (
                    <div key={cat}>
                      <p className={`text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2 ${c.text}`}>
                        <span className={`px-2 py-0.5 rounded-full ${c.bg}`}>{c.label}</span>
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </p>
                      <div className="space-y-2 mb-5">
                        {items.map(s => (
                          <div key={s.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#242C2D]">{s.title}</p>
                                <p className="text-xs text-[#6B7280] mt-0.5">{s.description}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {s.estimatedValue && (
                                  <p className="text-sm font-mono font-semibold text-[#242C2D]">{fmt(s.estimatedValue)}</p>
                                )}
                                {s.timeline && (
                                  <p className="text-[10px] font-mono text-[#9CA3AF]">{s.timeline}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Link href={`/deals/${s.dealId}`}
                                className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#FF6400] transition-colors">
                                {s.dealName} →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
