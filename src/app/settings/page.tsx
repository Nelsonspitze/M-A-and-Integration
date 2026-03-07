"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { getDeals, saveDeal } from "@/lib/store";
import { loadDemo, isDemoLoaded, DEMO_ID } from "@/lib/demo";
import { Trash2, RefreshCw, Database, Sparkles, Info } from "lucide-react";

export default function SettingsPage() {
  const [demoLoaded, setDemoLoaded] = useState(() => isDemoLoaded());
  const [cleared, setCleared] = useState(false);

  function handleLoadDemo() {
    loadDemo();
    setDemoLoaded(true);
    setCleared(false);
  }

  function handleRemoveDemo() {
    const deals = getDeals().filter(d => d.id !== DEMO_ID);
    localStorage.setItem("pmi_deals", JSON.stringify(deals));
    setDemoLoaded(false);
  }

  function handleClearAll() {
    if (!confirm("Clear all deal data? This cannot be undone.")) return;
    localStorage.removeItem("pmi_deals");
    setDemoLoaded(false);
    setCleared(true);
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 pt-12 pb-20">

          <div className="mb-10">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Settings</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight">Settings</h1>
          </div>

          {/* Demo data */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#F5F0FE] flex items-center justify-center shrink-0">
                <Database size={16} className="text-[#CDADFC]" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Demo data</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  BuildCo × Quinnect — a realistic 52-day post-close integration with tasks, team, and AI plans pre-loaded.
                </p>
              </div>
            </div>
            {demoLoaded ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-[#9AC183] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9AC183]" /> Demo loaded
                </span>
                <button onClick={handleRemoveDemo}
                  className="text-xs text-[#9CA3AF] hover:text-[#FF6400] transition-colors underline underline-offset-2">
                  Remove demo
                </button>
              </div>
            ) : (
              <button onClick={handleLoadDemo}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#CDADFC]/60 hover:bg-[#F5F0FE] hover:text-[#7C3AED] transition-all">
                <RefreshCw size={12} /> Load demo data
              </button>
            )}
          </div>

          {/* AI model */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl sf-gradient flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#242C2D] text-sm">AI model</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5 mb-3">Used for action plan generation and AI planning chat.</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg w-fit">
                  <span className="text-xs font-mono text-[#374151]">claude-sonnet-4-6</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#9AC183]/20 text-[#374151]">active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data storage */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#9CA3AF]" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Data storage</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  All deal data is stored locally in your browser (localStorage). Nothing is sent to a server except AI chat messages to Claude.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
              <span>{getDeals().length} deals stored</span>
              <span>·</span>
              <span>{getDeals().reduce((a, d) => a + d.tasks.length, 0)} total tasks</span>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white border border-[#FCA5A5]/40 rounded-xl p-6">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#EF4444] mb-4">Danger zone</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#242C2D]">Clear all data</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">Permanently delete all deals, tasks, and team data.</p>
              </div>
              <button onClick={handleClearAll}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border border-[#FCA5A5]/60 text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                <Trash2 size={12} /> Clear all
              </button>
            </div>
            {cleared && (
              <p className="text-xs text-[#9CA3AF] mt-3">All data cleared. Refresh the page to start fresh.</p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
