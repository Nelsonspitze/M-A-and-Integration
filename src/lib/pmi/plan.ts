import type { IntegrationStrategy } from "./library";

export type PlanStatus      = "draft" | "published";
export type SynergyCategory = "revenue" | "cost" | "capability" | "market";
export type PhaseKey        = "day1" | "month1" | "month3" | "month6" | "month12";

export interface SynergyItem {
  id: string;
  category: SynergyCategory;
  title: string;
  description: string;
  estimatedValue?: number; // €k
  timeline?: string;       // "Month 3", "Year 1", etc.
}

export interface WorkstreamDecision {
  workstreamId: string;
  strategy: IntegrationStrategy;
  rationale: string;
  keyRisks: string;
  owner: string;
}

export interface PhaseMilestone {
  id: string;
  phase: PhaseKey;
  title: string;
  workstreamId?: string;
}

export interface OrgSensitivity {
  headcountImpact:  string;
  roleEliminations: string;
  salaryAlignment:  string;
  retentionRisk:    string;
  confidentialNotes: string;
}

export interface DealPlan {
  dealId:      string;
  status:      PlanStatus;
  dealRationale:        string;
  synergyMap:           SynergyItem[];
  workstreamDecisions:  WorkstreamDecision[];
  milestones:           PhaseMilestone[];
  orgSensitivity:       OrgSensitivity;
  createdAt:   string;
  updatedAt:   string;
  publishedAt?: string;
}

export const PHASE_LABELS: Record<PhaseKey, string> = {
  day1:    "Day 1",
  month1:  "Month 1 (Days 2–30)",
  month3:  "Month 3 (Days 31–90)",
  month6:  "Month 6 (Days 91–180)",
  month12: "Month 12 (Days 181–365)",
};

export const SYNERGY_COLORS: Record<SynergyCategory, { bg: string; text: string; label: string }> = {
  revenue:    { bg: "bg-[#FFEFE5]", text: "text-[#FF6400]", label: "Revenue" },
  cost:       { bg: "bg-[#F0FDF4]", text: "text-[#9AC183]", label: "Cost" },
  capability: { bg: "bg-[#EEF2FE]", text: "text-[#74A0F4]", label: "Capability" },
  market:     { bg: "bg-[#F5F0FE]", text: "text-[#CDADFC]", label: "Market" },
};

const KEY = "pmi_plans";

function getAll(): Record<string, DealPlan> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function getPlan(dealId: string): DealPlan | null {
  return getAll()[dealId] ?? null;
}

export function savePlan(plan: DealPlan): void {
  const all = getAll();
  all[plan.dealId] = { ...plan, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function createPlan(dealId: string): DealPlan {
  const now = new Date().toISOString();
  const plan: DealPlan = {
    dealId,
    status: "draft",
    dealRationale: "",
    synergyMap: [],
    workstreamDecisions: [],
    milestones: [],
    orgSensitivity: { headcountImpact: "", roleEliminations: "", salaryAlignment: "", retentionRisk: "", confidentialNotes: "" },
    createdAt: now,
    updatedAt: now,
  };
  savePlan(plan);
  return plan;
}
