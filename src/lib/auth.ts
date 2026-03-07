export type AppRole = "ma-admin" | "c-level" | "dept-lead" | "team-member";

export interface AppUser {
  id: string;
  name: string;
  role: AppRole;
  deptId?: string; // workstream id for dept-lead / team-member
}

const KEY = "app_user";

export const DEMO_USERS: AppUser[] = [
  { id: "ma1",  name: "Marcus Wellington", role: "ma-admin" },
  { id: "cl1",  name: "Sarah van den Berg", role: "c-level" },
  { id: "dl1",  name: "Elena Rodriguez",   role: "dept-lead",   deptId: "hr" },
  { id: "dl2",  name: "Anna Schmidt",       role: "dept-lead",   deptId: "finance" },
  { id: "dl3",  name: "David Kim",          role: "dept-lead",   deptId: "it" },
  { id: "tm1",  name: "Thomas Weber",       role: "team-member", deptId: "commercial" },
];

export const ROLE_LABELS: Record<AppRole, string> = {
  "ma-admin":    "M&A Admin",
  "c-level":     "C-Level",
  "dept-lead":   "Department Lead",
  "team-member": "Team Member",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  "ma-admin":    "Full access: CRM pipeline, all integrations, sensitive data, planning wizard",
  "c-level":     "Integration planning, all workstreams, sensitive org data — no CRM edit",
  "dept-lead":   "Own workstream tasks and context — no CRM, no other departments",
  "team-member": "Assigned tasks only — no sensitive financial or org data",
};

export function getUser(): AppUser {
  if (typeof window === "undefined") return DEMO_USERS[0];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : DEMO_USERS[0];
  } catch { return DEMO_USERS[0]; }
}

export function setUser(user: AppUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("user-change"));
}

// ── Role capability checks ────────────────────────────────────────────────────

export function canSeeCRM(u: AppUser)             { return u.role === "ma-admin"; }
export function canSeePlanning(u: AppUser)         { return u.role === "ma-admin" || u.role === "c-level"; }
export function canSeeOrgSensitivity(u: AppUser)   { return u.role === "ma-admin" || u.role === "c-level"; }
export function canCreateIntegration(u: AppUser)   { return u.role === "ma-admin" || u.role === "c-level"; }
export function canSeeScoreboard(u: AppUser)       { return u.role === "ma-admin" || u.role === "c-level"; }
export function canEditDeal(u: AppUser)            { return u.role === "ma-admin" || u.role === "c-level"; }
export function canSeeAllWorkstreams(u: AppUser)   { return u.role === "ma-admin" || u.role === "c-level"; }

export function canSeeWorkstream(u: AppUser, wsId: string): boolean {
  if (canSeeAllWorkstreams(u)) return true;
  return u.deptId === wsId;
}
