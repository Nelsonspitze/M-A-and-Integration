import type { PartyRole, PartyType, Permissions, DocClassification, SellerTransitionState } from "./access/types";
import { getDefaultPermissions, mergePermissions, applyTransitionModifier } from "./access/defaults";
export type { PartyRole, PartyType, Permissions, SellerTransitionState };
export { ROLE_LABELS, ROLE_DESCRIPTIONS, PARTY_ROLE_OPTIONS } from "./access/defaults";

// ── User ──────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  partyId: string;            // which Party this user belongs to
  partyType: PartyType;       // buyer | seller | advisor (denormalized)
  role: PartyRole;
  deptId?: string;            // workstreamId — for dept-lead and team-member variants
  transitionState?: SellerTransitionState; // seller users only
}

// ── Party (lightweight, stored in localStorage) ───────────────────────────────

export interface AppParty {
  id: string;
  name: string;
  type: PartyType;
}

const PARTIES_KEY = "app_parties";
const KEY = "app_user";
const PARTIES_DEFAULT: AppParty[] = [
  { id: "buyer-co",   name: "Platform Company",  type: "buyer"   },
  { id: "seller-co",  name: "Add-on Company",    type: "seller"  },
  { id: "advisor-co", name: "External Advisors", type: "advisor" },
];

export function getParties(): AppParty[] {
  if (typeof window === "undefined") return PARTIES_DEFAULT;
  try {
    const raw = localStorage.getItem(PARTIES_KEY);
    return raw ? JSON.parse(raw) : PARTIES_DEFAULT;
  } catch { return PARTIES_DEFAULT; }
}

export function saveParties(parties: AppParty[]): void {
  localStorage.setItem(PARTIES_KEY, JSON.stringify(parties));
}

// ── Demo users ────────────────────────────────────────────────────────────────

export const DEMO_USERS: AppUser[] = [
  { id: "ma1",  name: "Marcus Wellington",  partyId: "buyer-co",   partyType: "buyer",   role: "buyer:ma-admin"     },
  { id: "cl1",  name: "Sarah van den Berg", partyId: "buyer-co",   partyType: "buyer",   role: "buyer:c-level"      },
  { id: "dl1",  name: "Elena Rodriguez",    partyId: "buyer-co",   partyType: "buyer",   role: "buyer:dept-lead",   deptId: "hr"       },
  { id: "dl2",  name: "Anna Schmidt",        partyId: "buyer-co",   partyType: "buyer",   role: "buyer:dept-lead",   deptId: "finance"  },
  { id: "dl3",  name: "David Kim",           partyId: "buyer-co",   partyType: "buyer",   role: "buyer:dept-lead",   deptId: "it"       },
  { id: "tm1",  name: "Thomas Weber",        partyId: "buyer-co",   partyType: "buyer",   role: "buyer:team-member", deptId: "commercial" },
  // Seller users
  { id: "ss1",  name: "Jan de Vries",        partyId: "seller-co",  partyType: "seller",  role: "seller:sponsor"     },
  { id: "sm1",  name: "Lisa Bakker",         partyId: "seller-co",  partyType: "seller",  role: "seller:mgmt-lead"   },
  { id: "sdl1", name: "Ravi Patel",          partyId: "seller-co",  partyType: "seller",  role: "seller:dept-lead",  deptId: "hr", transitionState: "seller-active" },
  // Advisor
  { id: "av1",  name: "Claire Dubois",       partyId: "advisor-co", partyType: "advisor", role: "advisor:lead"       },
];

// ── User store ────────────────────────────────────────────────────────────────

export function getUser(): AppUser {
  if (typeof window === "undefined") return DEMO_USERS[0];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEMO_USERS[0];
    const stored = JSON.parse(raw);
    // Migrate legacy users (without partyType/partyId)
    if (!stored.partyType) return migrateLegacyUser(stored);
    // Validate role is a known PartyRole; reset to admin if not
    const knownRoles: PartyRole[] = [
      "buyer:ma-admin","buyer:c-level","buyer:dept-lead","buyer:team-member",
      "seller:sponsor","seller:mgmt-lead","seller:dept-lead","seller:team-member",
      "advisor:lead","advisor:analyst",
    ];
    if (!knownRoles.includes(stored.role)) return DEMO_USERS[0]; // fallback to buyer:ma-admin
    return stored as AppUser;
  } catch { return DEMO_USERS[0]; }
}

function migrateLegacyUser(legacy: Record<string, unknown>): AppUser {
  const roleMap: Record<string, PartyRole> = {
    "ma-admin":    "buyer:ma-admin",
    "c-level":     "buyer:c-level",
    "dept-lead":   "buyer:dept-lead",
    "team-member": "buyer:team-member",
  };
  return {
    id:        String(legacy.id ?? "ma1"),
    name:      String(legacy.name ?? "Unknown"),
    partyId:   "buyer-co",
    partyType: "buyer",
    role:      roleMap[String(legacy.role)] ?? "buyer:ma-admin",
    deptId:    legacy.deptId ? String(legacy.deptId) : undefined,
  };
}

export function setUser(user: AppUser): void {
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("user-change"));
}

// ── All platform users (for team management) ──────────────────────────────────

const ALL_USERS_KEY = "app_users";

export function getAllUsers(): AppUser[] {
  if (typeof window === "undefined") return DEMO_USERS;
  try {
    const raw = localStorage.getItem(ALL_USERS_KEY);
    return raw ? JSON.parse(raw) : DEMO_USERS;
  } catch { return DEMO_USERS; }
}

export function saveAllUsers(users: AppUser[]): void {
  localStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  window.dispatchEvent(new Event("user-change"));
}

export function transitionSellerUser(userId: string, state: SellerTransitionState): void {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return;
  users[idx] = { ...users[idx], transitionState: state };
  saveAllUsers(users);
  // Also update current user if it's the same person
  const current = getUser();
  if (current.id === userId) setUser({ ...current, transitionState: state });
}

// ── Permission resolution ─────────────────────────────────────────────────────

export function resolvePermissions(
  user: AppUser,
  dealParticipantOverride?: Partial<Permissions>
): Permissions {
  let perms = getDefaultPermissions(user.role);

  // Apply per-deal admin overrides (can only restrict)
  if (dealParticipantOverride) {
    perms = mergePermissions(perms, dealParticipantOverride);
  }

  // Apply seller transition modifier
  if (user.partyType === "seller") {
    perms = applyTransitionModifier(perms, user.transitionState);
  }

  return perms;
}

export function canSeeWorkstream(perms: Permissions, wsId: string, userDeptId?: string): boolean {
  if (perms.workstreams === "none") return false;
  if (perms.workstreamAll) return true;
  return userDeptId === wsId;
}

// ── Document access ───────────────────────────────────────────────────────────

export function canReadDocument(
  perms: Permissions,
  user: AppUser,
  classification: DocClassification,
  visibleToPartyTypes?: PartyType[]
): boolean {
  if (perms.vdr === "none" && perms.dataroom === "none") return false;
  if (visibleToPartyTypes && !visibleToPartyTypes.includes(user.partyType)) return false;
  switch (classification) {
    case "public":             return true;
    case "deal-confidential":  return true;
    case "restricted":
      return user.role === "buyer:ma-admin" || user.role === "buyer:c-level";
    case "highly-restricted":
      return user.role === "buyer:ma-admin" && perms.orgSensitivity;
  }
}

// ── Legacy shims (kept for gradual callsite migration) ────────────────────────
// These will be removed once all callsites use resolvePermissions() directly.

/** @deprecated Use resolvePermissions(user).pipeline !== "none" */
export function canSeeCRM(u: AppUser): boolean {
  return resolvePermissions(u).pipeline !== "none";
}

/** @deprecated Use resolvePermissions(user).planningWizard !== "none" */
export function canSeePlanning(u: AppUser): boolean {
  return resolvePermissions(u).planningWizard !== "none";
}

/** @deprecated Use resolvePermissions(user).orgSensitivity */
export function canSeeOrgSensitivity(u: AppUser): boolean {
  return resolvePermissions(u).orgSensitivity;
}

/** @deprecated Use resolvePermissions(user).canEditDeal */
export function canEditDeal(u: AppUser): boolean {
  return resolvePermissions(u).canEditDeal;
}

/** @deprecated Use resolvePermissions(user).canViewScoreboard */
export function canSeeScoreboard(u: AppUser): boolean {
  return resolvePermissions(u).canViewScoreboard;
}

/** @deprecated Use canSeeWorkstream(perms, wsId, user.deptId) */
export function canSeeAllWorkstreams(u: AppUser): boolean {
  return resolvePermissions(u).workstreamAll;
}

/** @deprecated Use resolvePermissions(user).canAddTarget */
export function canCreateIntegration(u: AppUser): boolean {
  return resolvePermissions(u).canEditDeal;
}

// Legacy AppRole type for settings page migration
export type AppRole = "ma-admin" | "c-level" | "dept-lead" | "team-member";
