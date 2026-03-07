"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeal } from "@/lib/store";
import { INTEGRATION_STRATEGIES, IntegrationStrategy } from "@/lib/pmi/library";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sidebar } from "@/components/sidebar";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

const strategyIcons: Record<string, string> = {
  full: "🔗", partial: "🔀", "bolt-on": "⚡", standalone: "🏝️",
};

export default function NewDealPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", platformCompany: "", addOnCompany: "",
    closeDate: new Date().toISOString().split("T")[0],
    overallStrategy: "" as IntegrationStrategy | "",
    dealBrief: "",
  });

  const valid = form.name && form.platformCompany && form.addOnCompany && form.closeDate && form.overallStrategy;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.overallStrategy) return;
    const deal = createDeal({
      name: form.name, platformCompany: form.platformCompany,
      addOnCompany: form.addOnCompany, closeDate: form.closeDate,
      overallStrategy: form.overallStrategy, dealBrief: form.dealBrief,
    });
    router.push(`/deals/${deal.id}`);
  }

  return (
    <div className="flex h-screen bg-[#FAF8F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">

        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#FAF8F5]/80 backdrop-blur border-b border-[#E8E4DE] px-8 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#1a1a1a]">New Integration</h1>
            <p className="text-xs text-[#9CA3AF]">Set up your deal and integration strategy</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DE] bg-white text-xs font-medium text-[#1a1a1a]">
            <Sparkles size={12} className="text-[#22C55E]" /> Ask AI
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Deal info */}
            <div className="bg-white rounded-xl border border-[#E8E4DE] p-6 space-y-4">
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Deal details</p>
              <div>
                <Label className="text-xs text-[#374151] font-medium">Integration name</Label>
                <Input
                  placeholder="e.g. Platform A × Acme B Integration 2025"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 h-10 rounded-lg border-[#E8E4DE] bg-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-[#374151] font-medium">Platform company</Label>
                  <Input placeholder="Acquiring company" value={form.platformCompany}
                    onChange={e => setForm({ ...form, platformCompany: e.target.value })}
                    className="mt-1.5 h-10 rounded-lg border-[#E8E4DE] bg-white text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-[#374151] font-medium">Add-on company</Label>
                  <Input placeholder="Acquired company" value={form.addOnCompany}
                    onChange={e => setForm({ ...form, addOnCompany: e.target.value })}
                    className="mt-1.5 h-10 rounded-lg border-[#E8E4DE] bg-white text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-[#374151] font-medium">Close date</Label>
                <Input type="date" value={form.closeDate}
                  onChange={e => setForm({ ...form, closeDate: e.target.value })}
                  className="mt-1.5 h-10 rounded-lg border-[#E8E4DE] bg-white text-sm w-48" />
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-white rounded-xl border border-[#E8E4DE] p-6">
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Integration strategy</p>
                <p className="text-xs text-[#9CA3AF]">Set by CEO · department heads can override per workstream</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INTEGRATION_STRATEGIES.map(s => {
                  const sel = form.overallStrategy === s.value;
                  return (
                    <button key={s.value} type="button" onClick={() => setForm({ ...form, overallStrategy: s.value })}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${sel ? "border-[#22C55E] bg-green-50" : "border-[#E8E4DE] hover:border-[#D1D5DB] bg-white"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{strategyIcons[s.value]}</span>
                          <span className="font-semibold text-sm text-[#1a1a1a]">{s.label}</span>
                        </div>
                        {sel && <CheckCircle2 size={15} className="text-[#22C55E]" />}
                      </div>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{s.description}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-2 font-mono">{s.activeWorkstreams.length} workstreams active</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deal brief */}
            <div className="bg-white rounded-xl border border-[#E8E4DE] p-6">
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Deal brief</p>
                <p className="text-xs text-[#9CA3AF]">Used by AI to generate deal-specific action plans</p>
              </div>
              <Textarea
                placeholder="e.g. Platform A is a B2B services company (200 FTE, NL + BE) acquiring Add-on B, a 45 FTE digital specialist, to expand digital capability. Key synergies: €300K revenue cross-sell + €150K back-office cost savings. Integration target: 12 months."
                value={form.dealBrief}
                onChange={e => setForm({ ...form, dealBrief: e.target.value })}
                rows={4} className="rounded-lg border-[#E8E4DE] text-sm resize-none bg-white" />
            </div>

            <button type="submit" disabled={!valid}
              className={`w-full py-3 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${valid ? "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]" : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"}`}>
              Create integration {valid && <ArrowRight size={15} />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
