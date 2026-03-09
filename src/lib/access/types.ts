// ── Party ─────────────────────────────────────────────────────────────────────

export type PartyType = "buyer" | "seller" | "advisor";

export interface Party {
  id: string;
  name: string;
  type: PartyType;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export type BuyerRole =
  | "buyer:ma-admin"    // Full access
  | "buyer:c-level"     // Strategic, no CRM edit
  | "buyer:dept-lead"   // Own workstream
  | "buyer:team-member"; // Assigned tasks only

export type SellerRole =
  | "seller:sponsor"      // PE/owner rep — reads synergies, workstream progress
  | "seller:mgmt-lead"    // Retained CEO/CFO — workstream progress only
  | "seller:dept-lead"    // Department lead (pre-close: VDR upload; post-close: integration)
  | "seller:team-member"; // Assigned tasks only (post-close)

export type AdvisorRole =
  | "advisor:lead"     // Lead advisor — CRM read, VDR read
  | "advisor:analyst"; // Support — VDR read only

export type PartyRole = BuyerRole | SellerRole | AdvisorRole;

export type SellerTransitionState =
  | "seller-active"      // Pre/at-close: seller permissions apply
  | "integration-member" // Post-close: elevated to buyer dept-lead equivalent
  | "archived";          // Post-integration: read-only history

// ── Permissions ───────────────────────────────────────────────────────────────

export type AccessLevel = "none" | "read" | "write" | "admin";

export interface Permissions {
  // Module gates
  pipeline:        AccessLevel;  // /crm — CRM pipeline
  workstreams:     AccessLevel;  // /deals/[id]/workstreams
  workstreamAll:   boolean;      // true = all workstreams; false = deptId only
  vdr:             AccessLevel;  // Virtual dataroom / CRM documents
  synergies:       AccessLevel;  // Synergy map
  orgSensitivity:  boolean;      // Headcount, comp, org chart data
  planningWizard:  AccessLevel;  // Integration planning wizard
  dataroom:        AccessLevel;  // Deal document hub
  // Action gates
  canEditDeal:       boolean;
  canAddTarget:      boolean;
  canManageTeam:     boolean;
  canViewScoreboard: boolean;
  canToggleTasks:    boolean;
}

export const ZERO_PERMISSIONS: Permissions = {
  pipeline:        "none",
  workstreams:     "none",
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
  canToggleTasks:    false,
};

// ── Document classification ───────────────────────────────────────────────────

export type DocClassification =
  | "public"            // Shareable outside deal room
  | "deal-confidential" // All invited participants
  | "restricted"        // buyer:c-level and above only
  | "highly-restricted"; // buyer:ma-admin + orgSensitivity only (comp, headcount)

// ── Per-deal participant ──────────────────────────────────────────────────────

export interface DealParticipant {
  userId: string;
  partyId: string;
  partyType: PartyType;
  permissionOverride?: Partial<Permissions>; // Admin-set restrictions on top of role defaults
  addedAt: string;
  addedBy: string;
}
