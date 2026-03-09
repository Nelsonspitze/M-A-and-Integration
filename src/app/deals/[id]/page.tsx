"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Deal, getDeal, saveDeal, TeamMember } from "@/lib/store";
import { scoreForDeal, medal } from "@/lib/scoring";
import { INTEGRATION_STRATEGIES, IntegrationStrategy, PMI_LIBRARY } from "@/lib/pmi/library";
import { Sidebar } from "@/components/sidebar";
import { ArrowRight, Sparkles, AlertTriangle, Plus, X, MapPin } from "lucide-react";
import Link from "next/link";
import { getUser, resolvePermissions, canSeeWorkstream } from "@/lib/auth";
import { getPlan } from "@/lib/pmi/plan";

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

const MEMBER_COLORS = [
  "bg-[#242C2D]", "bg-[#74A0F4]", "bg-[#CDADFC]", "bg-[#9AC183]",
  "bg-[#FF6400]", "bg-[#FCDCA0]", "bg-[#D4B800]", "bg-[#8A95A5]",
];

export default function DealPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", role: "", color: MEMBER_COLORS[0] });
  const [scoreTab, setScoreTab] = useState<"people" | "dept">("people");
  const score = useMemo(() => deal ? scoreForDeal(deal) : null, [deal]);

  useEffect(() => {
    const d = getDeal(params.id as string);
    if (!d) { router.push("/"); return; }
    setDeal(d);
  }, [params.id, router]);

  if (!deal || !score) return null;

  const user              = getUser();
  const perms             = resolvePermissions(user);
  const plan              = getPlan(deal.id);
  const isPlanning        = deal.planStatus === "planning";
  const showScoreboard    = perms.canViewScoreboard;
  const showAllWorkstreams = perms.workstreamAll;

  const progress = getDealProgress(deal);
  const days = Math.max(0, Math.floor((Date.now() - new Date(deal.closeDate).getTime()) / 86400000));
  const strategy = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy);
  const allActiveWorkstreams = PMI_LIBRARY.filter(ws => strategy?.activeWorkstreams.includes(ws.id));
  // Role-filtered workstreams
  const activeWorkstreams = allActiveWorkstreams.filter(ws => canSeeWorkstream(perms, ws.id, user.deptId));
  const atRisk = activeWorkstreams.filter(ws => {
    const p = getWsProgress(deal, ws.id);
    return p !== null && p < 40;
  }).length;

  // Prompt to generate first AI plan if deal is fresh
  const hasAnyPlan = Object.keys(deal.actionPlans).length > 0;

  function addMember() {
    if (!newMember.name || !newMember.role) return;
    const initials = newMember.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const member: TeamMember = {
      id: crypto.randomUUID(), name: newMember.name, role: newMember.role,
      initials, color: newMember.color,
    };
    const updated: Deal = { ...deal!, team: [...(deal!.team ?? []), member] };
    saveDeal(updated); setDeal(updated);
    setNewMember({ name: "", role: "", color: MEMBER_COLORS[(deal!.team?.length ?? 0) % MEMBER_COLORS.length] });
    setShowAddMember(false);
  }

  function removeMember(id: string) {
    const updated: Deal = { ...deal!, team: (deal!.team ?? []).filter(m => m.id !== id) };
    saveDeal(updated); setDeal(updated);
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 pt-12 pb-20">

          {/* Planning banner — M&A/C-level only */}
          {isPlanning && perms.planningWizard !== "none" && (
            <div className="bg-[#FFF7ED] border border-[#FF6400]/30 rounded-xl p-4 mb-6 flex items-center gap-3">
              <MapPin size={16} className="text-[#FF6400] shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#242C2D]">Integration plan in progress</p>
                <p className="text-xs text-[#6B7280] mt-0.5">Complete the planning wizard before departments can see their workstreams.</p>
              </div>
              <Link href={`/deals/${deal.id}/plan`}>
                <button className="sf-gradient text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-1.5 shrink-0">
                  Open wizard <ArrowRight size={11} />
                </button>
              </Link>
            </div>
          )}

          {/* Dept/team-member: planning in progress placeholder */}
          {isPlanning && perms.planningWizard === "none" && (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
                <MapPin size={20} className="text-[#9CA3AF]" />
              </div>
              <h2 className="text-lg font-light text-[#242C2D] mb-2">Plan in preparation</h2>
              <p className="text-sm text-[#6B7280] max-w-sm mx-auto">
                The M&A team is finalising the integration plan for {deal.addOnCompany}. You&apos;ll be notified when your workstream is ready.
              </p>
            </div>
          )}

          {/* Deal header */}
          {(!isPlanning || perms.planningWizard !== "none") && <div className="mb-8">
            <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Integration</p>
            <h1 className="text-4xl font-light text-[#242C2D] heading-tight mb-1">{deal.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-[#6B7280]">{deal.platformCompany} × {deal.addOnCompany}</span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">{strategy?.label}</span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">Day {days} post-close</span>
            </div>
          </div>}

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
          {/* Scoreboard — M&A and C-level only */}
          {showScoreboard && <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-[#242C2D]">Scoreboard</h2>
              <div className="flex items-center gap-3">
                {score.totalOverdue > 0 && (
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#FFEFE5] text-[#FF6400] flex items-center gap-1">
                    ⚠ {score.totalOverdue} overdue
                  </span>
                )}
                <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden text-xs">
                  {(["people", "dept"] as const).map(tab => (
                    <button key={tab} onClick={() => setScoreTab(tab)}
                      className={`px-3 py-1.5 font-medium transition-colors ${scoreTab === tab ? "bg-[#242C2D] text-white" : "text-[#6B7280] hover:bg-[#FAFAFA]"}`}>
                      {tab === "people" ? "People" : "Departments"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Health score banner */}
            <div className={`rounded-xl p-4 mb-3 flex items-center justify-between ${
              score.healthScore >= 70 ? "bg-[#9AC183]/10 border border-[#9AC183]/30" :
              score.healthScore >= 40 ? "bg-[#FCDCA0]/30 border border-[#FCDCA0]" :
              "bg-[#FFEFE5] border border-[#FFD4B8]"
            }`}>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-0.5">Tasks on schedule</p>
                <p className="text-xs text-[#6B7280]">
                  {score.dueCompleted} of {score.dueTasks} due tasks completed
                </p>
              </div>
              <span className={`text-4xl font-light heading-tight ${
                score.healthScore >= 70 ? "text-[#9AC183]" :
                score.healthScore >= 40 ? "text-[#D4B800]" : "text-[#FF6400]"
              }`}>{score.healthScore}%</span>
            </div>

            {/* People leaderboard */}
            {scoreTab === "people" && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                {score.personScores.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-[#9CA3AF]">Add team members to see the leaderboard.</p>
                  </div>
                ) : (
                  score.personScores.map((ps, i) => (
                    <div key={ps.member.id} className={`flex items-center gap-4 px-5 py-3.5 ${i !== score.personScores.length - 1 ? "border-b border-[#F3F4F6]" : ""}`}>
                      <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                      <div className={`w-9 h-9 rounded-full ${ps.member.color} flex items-center justify-center shrink-0`}>
                        <span className="text-xs font-bold text-white">{ps.member.initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[#242C2D]">{ps.member.name}</p>
                          <p className="text-[10px] text-[#9CA3AF]">{ps.member.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full bg-[#9AC183] transition-all"
                              style={{ width: `${ps.assigned > 0 ? Math.round(ps.completed / ps.assigned * 100) : 0}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-[#9CA3AF]">{ps.completed}/{ps.assigned}</span>
                          {ps.overdue > 0 && (
                            <span className="text-[9px] font-mono text-[#FF6400] bg-[#FFEFE5] px-1.5 py-0.5 rounded-full">
                              {ps.overdue} overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-light heading-tight ${ps.points >= 0 ? "text-[#242C2D]" : "text-[#FF6400]"}`}>
                          {ps.points > 0 ? "+" : ""}{ps.points}
                        </p>
                        <p className="text-[9px] font-mono text-[#9CA3AF]">pts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Dept leaderboard */}
            {scoreTab === "dept" && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                {score.deptScores.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-[#9CA3AF]">No tasks yet.</p>
                  </div>
                ) : (
                  score.deptScores.map((ds, i) => (
                    <div key={ds.wsId} className={`flex items-center gap-4 px-5 py-3.5 ${i !== score.deptScores.length - 1 ? "border-b border-[#F3F4F6]" : ""}`}>
                      <span className="text-lg w-7 text-center shrink-0">{medal(i)}</span>
                      <span className="text-xl shrink-0">{ds.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#242C2D] mb-1">{ds.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div className="h-1.5 rounded-full bg-[#9AC183] transition-all"
                              style={{ width: `${ds.total > 0 ? Math.round(ds.completed / ds.total * 100) : 0}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-[#9CA3AF]">{ds.completed}/{ds.total}</span>
                          {ds.overdue > 0 && (
                            <span className="text-[9px] font-mono text-[#FF6400] bg-[#FFEFE5] px-1.5 py-0.5 rounded-full">
                              {ds.overdue} overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-light heading-tight ${ds.points >= 0 ? "text-[#242C2D]" : "text-[#FF6400]"}`}>
                          {ds.points > 0 ? "+" : ""}{ds.points}
                        </p>
                        <p className="text-[9px] font-mono text-[#9CA3AF]">pts</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>}

          {/* Team */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-[#242C2D]">Team</h2>
              <button onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#FF6400] transition-colors">
                {showAddMember ? <X size={12} /> : <Plus size={12} />}
                {showAddMember ? "Cancel" : "Add member"}
              </button>
            </div>

            {showAddMember && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Name</label>
                    <input
                      placeholder="e.g. Anna Schmidt"
                      value={newMember.name}
                      onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && addMember()}
                      className="w-full h-9 px-3 text-sm rounded-lg border border-[#E5E7EB] bg-white outline-none focus:border-[#FF6400]/50"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1">Role</label>
                    <input
                      placeholder="e.g. CFO"
                      value={newMember.role}
                      onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                      onKeyDown={e => e.key === "Enter" && addMember()}
                      className="w-full h-9 px-3 text-sm rounded-lg border border-[#E5E7EB] bg-white outline-none focus:border-[#FF6400]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Colour</label>
                  <div className="flex gap-2">
                    {MEMBER_COLORS.map(c => (
                      <button key={c} onClick={() => setNewMember({ ...newMember, color: c })}
                        className={`w-6 h-6 rounded-full ${c} transition-transform ${newMember.color === c ? "ring-2 ring-offset-1 ring-[#FF6400] scale-110" : "hover:scale-110"}`} />
                    ))}
                  </div>
                </div>
                <button onClick={addMember} disabled={!newMember.name || !newMember.role}
                  className="sf-gradient text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                  Add to team
                </button>
              </div>
            )}

            {(deal.team?.length ?? 0) === 0 && !showAddMember ? (
              <div className="bg-white border border-dashed border-[#E5E7EB] rounded-xl p-6 text-center">
                <p className="text-sm text-[#9CA3AF]">No team members yet.</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Add team members to assign tasks in each workstream.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(deal.team ?? []).map(m => (
                  <div key={m.id} className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-center gap-3 group">
                    <div className={`w-9 h-9 rounded-full ${m.color} flex items-center justify-center shrink-0`}>
                      <span className="text-xs font-bold text-white">{m.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#242C2D] truncate">{m.name}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{m.role}</p>
                    </div>
                    <button onClick={() => removeMember(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#D1D5DB] hover:text-[#FF6400] transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

