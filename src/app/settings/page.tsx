"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { getDeals } from "@/lib/store";
import { loadDemo, isDemoLoaded, DEMO_ID, loadCRMDemo, isCRMDemoLoaded } from "@/lib/demo";
import { loadFullDemo, isFullDemoLoaded } from "@/lib/demo-full";
import {
  getUser, setUser, getAllUsers, saveAllUsers, getParties, saveParties, transitionSellerUser,
  DEMO_USERS, ROLE_LABELS, ROLE_DESCRIPTIONS, AppUser, AppParty,
  resolvePermissions,
} from "@/lib/auth";
import { PARTY_ROLE_OPTIONS, PartyRole } from "@/lib/access/defaults";
import { PMI_LIBRARY } from "@/lib/pmi/library";
import { Trash2, RefreshCw, Database, Sparkles, Info, Users, ShieldCheck, Plus, X, ArrowRight, Building2, ChevronDown, ChevronUp, FolderOpen, LinkIcon } from "lucide-react";
import { getTargets } from "@/lib/crm/store";
import type { TargetCompany } from "@/lib/crm/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const partyBg: Record<string, string> = {
  buyer:   "bg-[#FFEFE5] text-[#FF6400]",
  seller:  "bg-[#EEF2FE] text-[#74A0F4]",
  advisor: "bg-[#F0FDF4] text-[#9AC183]",
};

const roleBg: Record<string, string> = {
  "buyer:ma-admin":     "bg-[#242C2D] text-white",
  "buyer:c-level":      "bg-[#FFEFE5] text-[#FF6400]",
  "buyer:dept-lead":    "bg-[#EEF2FE] text-[#74A0F4]",
  "buyer:team-member":  "bg-[#F3F4F6] text-[#6B7280]",
  "seller:sponsor":     "bg-[#F5F0FE] text-[#7C3AED]",
  "seller:mgmt-lead":   "bg-[#EEF2FE] text-[#74A0F4]",
  "seller:dept-lead":   "bg-[#F3F4F6] text-[#6B7280]",
  "seller:team-member": "bg-[#F3F4F6] text-[#9CA3AF]",
  "advisor:lead":       "bg-[#F0FDF4] text-[#9AC183]",
  "advisor:analyst":    "bg-[#F3F4F6] text-[#9CA3AF]",
};

const transitionLabels: Record<string, string> = {
  "seller-active":      "Pre-close (seller)",
  "integration-member": "Integration member",
  "archived":           "Archived",
};

// ── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  u, isCurrentUser, parties, crmLink, onSwitch, onUpdate, onRemove,
}: {
  u: AppUser;
  isCurrentUser: boolean;
  parties: AppParty[];
  crmLink?: { targetId: string; targetName: string };
  onSwitch: () => void;
  onUpdate: (patch: Partial<AppUser>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const perms = resolvePermissions(u);
  const party = parties.find(p => p.id === u.partyId);
  const isSeller = u.partyType === "seller";

  return (
    <div className={`border rounded-xl transition-all ${isCurrentUser ? "border-[#FF6400]/40 bg-[#FFF7ED]" : "border-[#E5E7EB] bg-white"}`}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-[#242C2D] flex items-center justify-center shrink-0">
          <span className="text-[11px] font-medium text-white">{u.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[#242C2D]">{u.name}</p>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${roleBg[u.role] ?? "bg-[#F3F4F6] text-[#6B7280]"}`}>
              {ROLE_LABELS[u.role]}
            </span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${partyBg[u.partyType]}`}>
              {party?.name ?? u.partyType}
            </span>
            {isSeller && u.transitionState && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#F5F0FE] text-[#7C3AED]">
                {transitionLabels[u.transitionState]}
              </span>
            )}
            {crmLink && (
              <a href={`/crm/${crmLink.targetId}`}
                className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#EEF2FE] text-[#74A0F4] hover:bg-[#74A0F4] hover:text-white transition-colors">
                <LinkIcon size={8} /> {crmLink.targetName}
              </a>
            )}
            {isCurrentUser && <span className="text-[9px] font-mono text-[#FF6400]">you</span>}
          </div>
          {u.deptId && (
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">
              Dept: {PMI_LIBRARY.find(w => w.id === u.deptId)?.name ?? u.deptId}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isCurrentUser && (
            <button onClick={onSwitch}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFEFE5] hover:text-[#FF6400] transition-all">
              Switch
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-[#9CA3AF] hover:text-[#374151] transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {!isCurrentUser && (
            <button onClick={onRemove}
              className="p-1.5 text-[#D1D5DB] hover:text-red-400 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded: edit role, dept, transition */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#F3F4F6] pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Role */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Role</label>
              <select value={u.role}
                onChange={e => {
                  const newRole = e.target.value as PartyRole;
                  const opt = PARTY_ROLE_OPTIONS.find(o => o.value === newRole);
                  onUpdate({ role: newRole, partyType: opt?.partyType ?? u.partyType });
                }}
                className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                {["buyer", "seller", "advisor"].map(pt => (
                  <optgroup key={pt} label={pt.charAt(0).toUpperCase() + pt.slice(1)}>
                    {PARTY_ROLE_OPTIONS.filter(o => o.partyType === pt).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Department</label>
              <select value={u.deptId ?? ""}
                onChange={e => onUpdate({ deptId: e.target.value || undefined })}
                className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                <option value="">None</option>
                {PMI_LIBRARY.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>

            {/* Party */}
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Company</label>
              <select value={u.partyId}
                onChange={e => {
                  const p = parties.find(p => p.id === e.target.value);
                  onUpdate({ partyId: e.target.value, partyType: p?.type ?? u.partyType });
                }}
                className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Seller transition */}
            {isSeller && (
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">
                  Post-close status
                </label>
                <select value={u.transitionState ?? "seller-active"}
                  onChange={e => onUpdate({ transitionState: e.target.value as AppUser["transitionState"] })}
                  className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                  <option value="seller-active">Pre-close (seller)</option>
                  <option value="integration-member">Integration member</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          {/* Permission preview */}
          <div className="bg-[#FAFAFA] rounded-xl p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Effective permissions</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {[
                { label: "Pipeline",         val: perms.pipeline },
                { label: "Workstreams",      val: perms.workstreams + (perms.workstreamAll ? " (all)" : " (own)") },
                { label: "VDR",              val: perms.vdr },
                { label: "Synergies",        val: perms.synergies },
                { label: "Planning wizard",  val: perms.planningWizard },
                { label: "Org sensitivity",  val: perms.orgSensitivity ? "yes" : "no" },
                { label: "Edit deal",        val: perms.canEditDeal ? "yes" : "no" },
                { label: "Manage team",      val: perms.canManageTeam ? "yes" : "no" },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between py-0.5 border-b border-[#F3F4F6]">
                  <span className="text-[10px] text-[#9CA3AF]">{label}</span>
                  <span className={`text-[10px] font-mono ${val === "none" || val === "no" ? "text-[#D1D5DB]" : "text-[#374151]"}`}>
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [demoLoaded, setDemoLoaded]         = useState(false);
  const [crmDemoLoaded, setCrmDemoLoaded]   = useState(false);
  const [fullDemoLoaded, setFullDemoLoaded] = useState(false);
  const [cleared, setCleared]             = useState(false);
  const [currentUser, setCurrentUser]     = useState<AppUser>(DEMO_USERS[0]);
  const [users, setUsers]                 = useState<AppUser[]>(DEMO_USERS);
  const [parties, setParties]             = useState<AppParty[]>([]);
  const [crmTargets, setCrmTargets]       = useState<TargetCompany[]>([]);

  // Load from localStorage only on the client to avoid hydration mismatch
  useEffect(() => {
    setDemoLoaded(isDemoLoaded());
    setCrmDemoLoaded(isCRMDemoLoaded());
    setFullDemoLoaded(isFullDemoLoaded());
    setCurrentUser(getUser());
    setUsers(getAllUsers());
    setParties(getParties());
    setCrmTargets(getTargets());
  }, []);
  const [showAddUser, setShowAddUser]     = useState(false);
  const [showAddParty, setShowAddParty]   = useState(false);

  // New user form
  const [newName, setNewName]   = useState("");
  const [newRole, setNewRole]   = useState<PartyRole>("buyer:team-member");
  const [newParty, setNewParty] = useState<string>(parties[0]?.id ?? "buyer-co");
  const [newDept, setNewDept]   = useState("");

  // New party form
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyType, setNewPartyType] = useState<"buyer" | "seller" | "advisor">("seller");

  function switchUser(u: AppUser) {
    setUser(u);
    setCurrentUser(u);
  }

  function updateUser(id: string, patch: Partial<AppUser>) {
    const updated = users.map(u => u.id === id ? { ...u, ...patch } : u);
    setUsers(updated);
    saveAllUsers(updated);
    if (id === currentUser.id) {
      const next = updated.find(u => u.id === id)!;
      setUser(next);
      setCurrentUser(next);
    }
  }

  function removeUser(id: string) {
    if (!confirm("Remove this user?")) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveAllUsers(updated);
  }

  function addUser() {
    if (!newName.trim()) return;
    const party = parties.find(p => p.id === newParty);
    const opt   = PARTY_ROLE_OPTIONS.find(o => o.value === newRole);
    const u: AppUser = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      partyId: newParty,
      partyType: opt?.partyType ?? "buyer",
      role: newRole,
      deptId: newDept || undefined,
      transitionState: opt?.partyType === "seller" ? "seller-active" : undefined,
    };
    const updated = [...users, u];
    setUsers(updated);
    saveAllUsers(updated);
    setNewName(""); setShowAddUser(false);
  }

  function addParty() {
    if (!newPartyName.trim()) return;
    const p: AppParty = { id: crypto.randomUUID(), name: newPartyName.trim(), type: newPartyType };
    const updated = [...parties, p];
    setParties(updated);
    saveParties(updated);
    setNewPartyName(""); setShowAddParty(false);
  }

  function handleLoadDemo()     { loadDemo(); setDemoLoaded(true); setCleared(false); }
  function handleLoadCRMDemo()  { loadCRMDemo(); setCrmDemoLoaded(true); setCleared(false); }
  function handleLoadFullDemo() {
    loadFullDemo();
    setFullDemoLoaded(true);
    setCrmDemoLoaded(true);
    setCleared(false);
    setUsers(getAllUsers());
    setParties(getParties());
    setCrmTargets(getTargets());
  }
  function handleRemoveDemo()  {
    const deals = getDeals().filter(d => d.id !== DEMO_ID);
    localStorage.setItem("pmi_deals", JSON.stringify(deals));
    setDemoLoaded(false);
  }
  function handleClearAll() {
    if (!confirm("Clear all data? This cannot be undone.")) return;
    localStorage.removeItem("pmi_deals");
    localStorage.removeItem("crm_targets");
    setDemoLoaded(false); setCrmDemoLoaded(false); setCleared(true);
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

          {/* ── Companies / Parties ─────────────────────────────────────── */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FE] flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-[#74A0F4]" />
                </div>
                <div>
                  <p className="font-medium text-[#242C2D] text-sm">Companies</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Buyer, seller, and advisor organisations in this deal.</p>
                </div>
              </div>
              <button onClick={() => setShowAddParty(v => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#FF6400] transition-colors">
                <Plus size={11} /> Add
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {parties.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-[#E5E7EB]">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${partyBg[p.type]}`}>{p.type}</span>
                  <span className="text-sm text-[#242C2D] flex-1">{p.name}</span>
                  <span className="text-[10px] font-mono text-[#9CA3AF]">
                    {users.filter(u => u.partyId === p.id).length} users
                  </span>
                </div>
              ))}
            </div>

            {showAddParty && (
              <div className="p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-2 mt-2">
                <input value={newPartyName} onChange={e => setNewPartyName(e.target.value)}
                  placeholder="Company name" className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] px-3 text-[#374151]" />
                <div className="flex gap-2">
                  {(["buyer","seller","advisor"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setNewPartyType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs border capitalize transition-colors ${newPartyType === t ? "bg-[#242C2D] text-white border-[#242C2D]" : "border-[#E5E7EB] text-[#6B7280]"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <button onClick={addParty}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#242C2D] text-white hover:opacity-90 transition-opacity">
                  Add company
                </button>
              </div>
            )}
          </div>

          {/* ── Access Management ───────────────────────────────────────── */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0FE] flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} className="text-[#CDADFC]" />
                </div>
                <div>
                  <p className="font-medium text-[#242C2D] text-sm">Access management</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">
                    Roles and permissions per user and company. GDPR-aware access control.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddUser(v => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] hover:text-[#FF6400] transition-colors">
                <Plus size={11} /> Add user
              </button>
            </div>

            {/* Group by party */}
            {["buyer", "seller", "advisor"].map(pt => {
              const partyUsers = users.filter(u => u.partyType === pt);
              if (partyUsers.length === 0) return null;
              const ptParties = parties.filter(p => p.type === pt);
              return (
                <div key={pt} className="mb-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2"
                    style={{ color: pt === "buyer" ? "#FF6400" : pt === "seller" ? "#74A0F4" : "#9AC183" }}>
                    {ptParties.map(p => p.name).join(" · ")}
                  </p>
                  <div className="space-y-2">
                    {partyUsers.map(u => {
                      const linkedTarget = crmTargets.find(t =>
                        t.contacts.some(c => c.linkedUserId === u.id)
                      );
                      return (
                        <UserRow key={u.id}
                          u={u}
                          isCurrentUser={currentUser.id === u.id}
                          parties={parties}
                          crmLink={linkedTarget ? { targetId: linkedTarget.id, targetName: linkedTarget.name } : undefined}
                          onSwitch={() => switchUser(u)}
                          onUpdate={patch => updateUser(u.id, patch)}
                          onRemove={() => removeUser(u.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Add user form */}
            {showAddUser && (
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-3 mt-2">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF]">New user</p>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Full name" className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] px-3 text-[#374151]" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newRole} onChange={e => setNewRole(e.target.value as PartyRole)}
                    className="h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                    {["buyer","seller","advisor"].map(pt => (
                      <optgroup key={pt} label={pt.charAt(0).toUpperCase() + pt.slice(1)}>
                        {PARTY_ROLE_OPTIONS.filter(o => o.partyType === pt).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select value={newParty} onChange={e => setNewParty(e.target.value)}
                    className="h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={newDept} onChange={e => setNewDept(e.target.value)}
                    className="h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                    <option value="">No department</option>
                    {PMI_LIBRARY.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={addUser}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#242C2D] text-white hover:opacity-90 transition-opacity">
                    Add user
                  </button>
                  <button onClick={() => setShowAddUser(false)}
                    className="text-xs text-[#9CA3AF] hover:text-[#374151] px-2 py-1.5 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Permission matrix legend */}
            <div className="mt-4 p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Document classification</p>
              <div className="space-y-1">
                {[
                  { label: "Public",            desc: "Shareable outside the deal room", color: "#9AC183" },
                  { label: "Deal-confidential", desc: "All invited deal participants",   color: "#74A0F4" },
                  { label: "Restricted",        desc: "C-Level and M&A Admin only",      color: "#D4B800" },
                  { label: "Highly restricted", desc: "M&A Admin only — org sensitivity / GDPR", color: "#FF6400" },
                ].map(({ label, desc, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-mono text-[#374151] w-32 shrink-0">{label}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* ── Full platform demo ───────────────────────────────────────── */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl sf-gradient flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Full platform demo</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  3 active deals · 6 sellers &amp; advisors · datarooms with documents, Q&amp;A and requests.
                  Covers NDA (Veritas), IOI (Meridian) and Due Diligence (Crestline).
                </p>
              </div>
            </div>
            {fullDemoLoaded ? (
              <span className="flex items-center gap-1.5 text-xs text-[#9AC183] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9AC183]" /> Demo loaded
              </span>
            ) : (
              <button onClick={handleLoadFullDemo}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFF7ED] hover:text-[#FF6400] transition-all">
                <RefreshCw size={12} /> Load full demo
              </button>
            )}
          </div>

          {/* ── Demo / data / AI sections (unchanged) ───────────────────── */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#F5F0FE] flex items-center justify-center shrink-0">
                <Database size={16} className="text-[#CDADFC]" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Integration demo</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">BuildCo × Quinnect — realistic 52-day post-close integration.</p>
              </div>
            </div>
            {demoLoaded ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-[#9AC183] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9AC183]" /> Demo loaded
                </span>
                <button onClick={handleRemoveDemo}
                  className="text-xs text-[#9CA3AF] hover:text-[#FF6400] transition-colors underline underline-offset-2">Remove</button>
              </div>
            ) : (
              <button onClick={handleLoadDemo}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#CDADFC]/60 hover:bg-[#F5F0FE] hover:text-[#7C3AED] transition-all">
                <RefreshCw size={12} /> Load demo
              </button>
            )}
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center shrink-0">
                <Database size={16} className="text-[#FF6400]" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Pipeline demo</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">5 acquisition targets across stages with contacts and logs.</p>
              </div>
            </div>
            {crmDemoLoaded ? (
              <span className="flex items-center gap-1.5 text-xs text-[#9AC183] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9AC183]" /> Demo loaded
              </span>
            ) : (
              <button onClick={handleLoadCRMDemo}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#374151] hover:border-[#FF6400]/40 hover:bg-[#FFF7ED] hover:text-[#FF6400] transition-all">
                <RefreshCw size={12} /> Load pipeline demo
              </button>
            )}
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl sf-gradient flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#242C2D] text-sm">AI model</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5 mb-3">Action plan generation and planning chat.</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg w-fit">
                  <span className="text-xs font-mono text-[#374151]">claude-sonnet-4-6</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#9AC183]/20 text-[#374151]">active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <Info size={16} className="text-[#9CA3AF]" />
              </div>
              <div>
                <p className="font-medium text-[#242C2D] text-sm">Data storage</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">All deal data stored locally in your browser. AI messages go to Claude.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
              <span>{getDeals().length} deals</span>
              <span>·</span>
              <span>{getDeals().reduce((a, d) => a + d.tasks.length, 0)} tasks</span>
              <span>·</span>
              <span>{users.length} users</span>
            </div>
          </div>

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
            {cleared && <p className="text-xs text-[#9CA3AF] mt-3">All data cleared. Refresh to start fresh.</p>}
          </div>

        </div>
      </main>
    </div>
  );
}
