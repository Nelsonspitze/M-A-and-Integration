import type { PartyRole, Permissions, AccessLevel, SellerTransitionState } from "./types";
export type { PartyRole };
import { ZERO_PERMISSIONS } from "./types";

// Pure lookup — no side effects, no imports from store or auth

export function getDefaultPermissions(role: PartyRole): Permissions {
  switch (role) {

    // ── Buyer ─────────────────────────────────────────────────────────────

    case "buyer:ma-admin":
      return {
        pipeline:        "admin",
        workstreams:     "admin",
        workstreamAll:   true,
        vdr:             "admin",
        synergies:       "admin",
        orgSensitivity:  true,
        planningWizard:  "admin",
        dataroom:        "admin",
        canEditDeal:       true,
        canAddTarget:      true,
        canManageTeam:     true,
        canViewScoreboard: true,
        canToggleTasks:    true,
      };

    case "buyer:c-level":
      return {
        pipeline:        "read",
        workstreams:     "write",
        workstreamAll:   true,
        vdr:             "read",
        synergies:       "read",
        orgSensitivity:  true,
        planningWizard:  "write",
        dataroom:        "read",
        canEditDeal:       true,
        canAddTarget:      false,
        canManageTeam:     true,
        canViewScoreboard: true,
        canToggleTasks:    true,
      };

    case "buyer:dept-lead":
      return {
        pipeline:        "none",
        workstreams:     "write",
        workstreamAll:   false,
        vdr:             "none",
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "none",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    true,
      };

    case "buyer:team-member":
      return {
        pipeline:        "none",
        workstreams:     "write",
        workstreamAll:   false,
        vdr:             "none",
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "none",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    true,
      };

    // ── Seller ────────────────────────────────────────────────────────────

    case "seller:sponsor":
      return {
        pipeline:        "none",
        workstreams:     "read",
        workstreamAll:   true,
        vdr:             "read",
        synergies:       "read",   // sponsor is party to synergy thesis
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "read",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: true,
        canToggleTasks:    false,
      };

    case "seller:mgmt-lead":
      return {
        pipeline:        "none",
        workstreams:     "read",
        workstreamAll:   true,
        vdr:             "read",   // can access VDR — folder scope controlled by grants
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "read",  // so Dataroom appears in sidebar
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: true,
        canToggleTasks:    false,
      };

    case "seller:dept-lead":
      return {
        pipeline:        "none",
        workstreams:     "write",
        workstreamAll:   false,
        vdr:             "write",  // can upload docs to VDR pre-close
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "none",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    true,
      };

    case "seller:team-member":
      return {
        pipeline:        "none",
        workstreams:     "write",
        workstreamAll:   false,
        vdr:             "none",
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "none",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    true,
      };

    // ── Advisor ───────────────────────────────────────────────────────────

    case "advisor:lead":
      return {
        pipeline:        "read",
        workstreams:     "read",
        workstreamAll:   true,
        vdr:             "read",
        synergies:       "none",   // never — competitive info
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "read",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    false,
      };

    case "advisor:analyst":
      return {
        pipeline:        "none",
        workstreams:     "none",
        workstreamAll:   false,
        vdr:             "read",
        synergies:       "none",
        orgSensitivity:  false,
        planningWizard:  "none",
        dataroom:        "read",
        canEditDeal:       false,
        canAddTarget:      false,
        canManageTeam:     false,
        canViewScoreboard: false,
        canToggleTasks:    false,
      };

    default:
      return { ...ZERO_PERMISSIONS };
  }
}

// ── Merge: override can only RESTRICT relative to base ───────────────────────

const ACCESS_RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2, admin: 3 };

function minLevel(a: AccessLevel, b: AccessLevel | undefined): AccessLevel {
  if (b === undefined) return a;
  return ACCESS_RANK[a] <= ACCESS_RANK[b] ? a : b;
}

export function mergePermissions(
  base: Permissions,
  override: Partial<Permissions>
): Permissions {
  return {
    pipeline:        minLevel(base.pipeline, override.pipeline as AccessLevel | undefined),
    workstreams:     minLevel(base.workstreams, override.workstreams as AccessLevel | undefined),
    workstreamAll:   base.workstreamAll && (override.workstreamAll ?? true),
    vdr:             minLevel(base.vdr, override.vdr as AccessLevel | undefined),
    synergies:       minLevel(base.synergies, override.synergies as AccessLevel | undefined),
    orgSensitivity:  base.orgSensitivity && (override.orgSensitivity ?? true),
    planningWizard:  minLevel(base.planningWizard, override.planningWizard as AccessLevel | undefined),
    dataroom:        minLevel(base.dataroom, override.dataroom as AccessLevel | undefined),
    canEditDeal:       base.canEditDeal       && (override.canEditDeal       ?? true),
    canAddTarget:      base.canAddTarget      && (override.canAddTarget      ?? true),
    canManageTeam:     base.canManageTeam     && (override.canManageTeam     ?? true),
    canViewScoreboard: base.canViewScoreboard && (override.canViewScoreboard ?? true),
    canToggleTasks:    base.canToggleTasks    && (override.canToggleTasks    ?? true),
  };
}

// ── Seller post-close transition modifier ─────────────────────────────────────

export function applyTransitionModifier(
  perms: Permissions,
  transitionState: SellerTransitionState | undefined
): Permissions {
  if (!transitionState || transitionState === "seller-active") return perms;

  if (transitionState === "archived") {
    return {
      ...ZERO_PERMISSIONS,
      workstreams:     "read",
      workstreamAll:   false,
      canViewScoreboard: false,
    };
  }

  // integration-member: seller user is now part of the integration team
  return {
    ...perms,
    workstreams:     "write",
    workstreamAll:   false,
    canToggleTasks:  true,
    canViewScoreboard: true,
    // Hard ceilings — seller integration members never get these
    pipeline:        "none",
    orgSensitivity:  false,
    planningWizard:  "none",
  };
}

// ── Role metadata ─────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<PartyRole, string> = {
  "buyer:ma-admin":     "M&A Admin",
  "buyer:c-level":      "C-Level",
  "buyer:dept-lead":    "Department Lead",
  "buyer:team-member":  "Team Member",
  "seller:sponsor":     "Seller Sponsor",
  "seller:mgmt-lead":   "Seller Management",
  "seller:dept-lead":   "Seller Dept Lead",
  "seller:team-member": "Seller Team Member",
  "advisor:lead":       "Lead Advisor",
  "advisor:analyst":    "Advisor Analyst",
};

export const ROLE_DESCRIPTIONS: Record<PartyRole, string> = {
  "buyer:ma-admin":     "Full platform access: pipeline, all integrations, sensitive data, planning",
  "buyer:c-level":      "Integration planning, all workstreams, synergies, org sensitivity — no CRM edit",
  "buyer:dept-lead":    "Own workstream tasks and context only",
  "buyer:team-member":  "Assigned tasks only",
  "seller:sponsor":     "Deal economics and synergy read access, workstream progress overview",
  "seller:mgmt-lead":   "Workstream progress overview only — no financial or sensitive data",
  "seller:dept-lead":   "Own workstream + VDR upload (pre-close); integration tasks (post-close)",
  "seller:team-member": "Assigned integration tasks only (post-close)",
  "advisor:lead":       "Pipeline read, dataroom read — no synergies or org sensitivity",
  "advisor:analyst":    "Dataroom read only",
};

export const PARTY_ROLE_OPTIONS: { value: PartyRole; label: string; partyType: "buyer" | "seller" | "advisor" }[] = [
  { value: "buyer:ma-admin",     label: "M&A Admin",          partyType: "buyer" },
  { value: "buyer:c-level",      label: "C-Level",            partyType: "buyer" },
  { value: "buyer:dept-lead",    label: "Department Lead",    partyType: "buyer" },
  { value: "buyer:team-member",  label: "Team Member",        partyType: "buyer" },
  { value: "seller:sponsor",     label: "Seller Sponsor",     partyType: "seller" },
  { value: "seller:mgmt-lead",   label: "Seller Management",  partyType: "seller" },
  { value: "seller:dept-lead",   label: "Seller Dept Lead",   partyType: "seller" },
  { value: "seller:team-member", label: "Seller Team Member", partyType: "seller" },
  { value: "advisor:lead",       label: "Lead Advisor",       partyType: "advisor" },
  { value: "advisor:analyst",    label: "Advisor Analyst",    partyType: "advisor" },
];
