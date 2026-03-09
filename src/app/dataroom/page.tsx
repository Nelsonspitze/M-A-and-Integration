"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { getUser, resolvePermissions } from "@/lib/auth";
import { getTargets, STAGES, stageIndex } from "@/lib/crm/store";
import { getVDRStats } from "@/lib/vdr/store";
import { getGrants } from "@/lib/vdr/grants";
import { getRequests } from "@/lib/vdr/requests";
import type { TargetCompany } from "@/lib/crm/types";
import { FolderOpen, Lock, MessageSquare, FileText, ChevronRight, ArrowRight, Clock } from "lucide-react";

// VDR is available from NDA stage onwards
const VDR_MIN_STAGE = "nda";

function stageColor(s: string): string {
  return STAGES.find(x => x.id === s)?.color ?? "#9CA3AF";
}

function stageLabel(s: string): string {
  return STAGES.find(x => x.id === s)?.label ?? s;
}

interface VDRSummary {
  target: TargetCompany;
  docs: number;
  openQs: number;
  pendingRequests: number;
  totalViews: number;
}

export default function DataroomIndexPage() {
  const [summaries, setSummaries]     = useState<VDRSummary[]>([]);
  const [upcoming, setUpcoming]       = useState<TargetCompany[]>([]);
  const user  = getUser();
  const perms = resolvePermissions(user);

  useEffect(() => {
    const minIdx = stageIndex(VDR_MIN_STAGE);
    const targets = getTargets();
    const active: VDRSummary[] = [];
    const soon: TargetCompany[] = [];
    const isBuyer = user?.partyType === "buyer";

    for (const t of targets) {
      const idx = stageIndex(t.stage);
      if (idx >= minIdx) {
        // Non-buyers (sellers, advisors) only see targets where they have a grant
        if (!isBuyer && user) {
          const grants = getGrants(t.id);
          const hasGrant = grants.some(g => g.userId === user.id);
          if (!hasGrant) continue;
        }
        const stats = getVDRStats(t.id);
        const reqs  = getRequests(t.id);
        active.push({
          target: t,
          docs:  stats.total,
          openQs: stats.openQuestions,
          pendingRequests: reqs.filter(r => r.status === "pending").length,
          totalViews: stats.totalViews,
        });
      } else if (isBuyer && idx === minIdx - 1) {
        // "Upcoming" section only relevant for buyers managing the pipeline
        soon.push(t);
      }
    }

    // Sort active by stage desc (later stage first)
    active.sort((a, b) => stageIndex(b.target.stage) - stageIndex(a.target.stage));
    setSummaries(active);
    setUpcoming(soon);
  }, [user?.id]);

  if (perms.vdr === "none" && perms.dataroom === "none") {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-[#D1D5DB]" />
            </div>
            <p className="text-sm font-medium text-[#374151]">Access restricted</p>
            <p className="text-xs text-[#9CA3AF] mt-1">You don&apos;t have access to any datarooms.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Virtual Data Rooms</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight">Datarooms</h1>
            <p className="text-sm text-[#6B7280] mt-2">
              Per-deal data rooms, activated from NDA stage. Share documents, manage Q&A, and track requests.
            </p>
          </div>

          {/* Active VDRs */}
          {summaries.length > 0 ? (
            <div className="space-y-3 mb-10">
              {summaries.map(({ target: t, docs, openQs, pendingRequests, totalViews }) => (
                <Link key={t.id} href={`/dataroom/${t.id}`}
                  className="block bg-white border border-[#E5E7EB] rounded-2xl p-5 hover:border-[#FF6400]/30 hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                      <FolderOpen size={18} className="text-[#9CA3AF] group-hover:text-[#FF6400] transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-[#242C2D] truncate">{t.name}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: `${stageColor(t.stage)}20`, color: stageColor(t.stage) }}>
                          {stageLabel(t.stage)}
                        </span>
                        {t.sector && <span className="text-[10px] font-mono text-[#9CA3AF] shrink-0 hidden sm:inline">{t.sector}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-[#9CA3AF]">
                        <span className="flex items-center gap-1"><FileText size={10} /> {docs} doc{docs !== 1 ? "s" : ""}</span>
                        {openQs > 0 && <span className="flex items-center gap-1 text-[#FF6400]"><MessageSquare size={10} /> {openQs} open Q&A</span>}
                        {pendingRequests > 0 && <span className="flex items-center gap-1 text-[#D4B800]"><Clock size={10} /> {pendingRequests} request{pendingRequests !== 1 ? "s" : ""}</span>}
                        {totalViews > 0 && <span>{totalViews} views</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#FF6400] transition-colors shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-10 text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={22} className="text-[#D1D5DB]" />
              </div>
              <p className="text-sm font-medium text-[#374151]">No active datarooms</p>
              <p className="text-xs text-[#9CA3AF] mt-1 mb-4">
                {user?.partyType === "buyer"
                  ? "Datarooms are created when a target reaches the NDA stage."
                  : "You have not been granted access to any datarooms yet."}
              </p>
              {user?.partyType === "buyer" && (
                <Link href="/crm"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl sf-gradient text-white hover:opacity-90 transition-opacity">
                  <ArrowRight size={12} /> Go to pipeline
                </Link>
              )}
            </div>
          )}

          {/* Upcoming — targets approaching NDA */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Upcoming — approaching NDA</p>
              <div className="space-y-2">
                {upcoming.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stageColor(t.stage) }} />
                    <span className="text-sm text-[#374151] flex-1">{t.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${stageColor(t.stage)}15`, color: stageColor(t.stage) }}>
                      {stageLabel(t.stage)}
                    </span>
                    <Link href={`/crm/${t.id}`} className="text-[10px] font-mono text-[#9CA3AF] hover:text-[#FF6400] transition-colors flex items-center gap-1">
                      View <ChevronRight size={10} />
                    </Link>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#D1D5DB] mt-2 font-mono">Dataroom activates automatically when target advances to NDA.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
