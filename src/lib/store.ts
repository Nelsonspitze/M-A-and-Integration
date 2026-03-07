import { IntegrationStrategy } from "./pmi/library";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // tailwind bg color
}

export interface Task {
  id: string;
  itemId: string;
  workstreamId: string;
  dealId: string;
  title: string;
  assigneeId: string; // TeamMember id
  dueDate: string;
  completed: boolean;
  createdAt: string;
  phase?: string; // e.g. "Phase 1 — Week 1-2"
}

export interface WorkstreamConfig {
  workstreamId: string;
  strategy: IntegrationStrategy;
  owner: string;
  notes: string;
}

export interface Deal {
  id: string;
  name: string;
  addOnCompany: string;
  platformCompany: string;
  closeDate: string;
  overallStrategy: IntegrationStrategy;
  dealBrief: string;
  workstreamConfigs: WorkstreamConfig[];
  tasks: Task[];
  team: TeamMember[];
  actionPlans: Record<string, string>; // itemId -> AI generated plan
  createdAt: string;
  planStatus?: "planning" | "active"; // "planning" = M&A wizard in progress
  crmTargetId?: string;               // source CRM target, if converted
}

const STORAGE_KEY = "pmi_deals";

export function getDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getDeal(id: string): Deal | null {
  return getDeals().find(d => d.id === id) ?? null;
}

export function saveDeal(deal: Deal): void {
  const deals = getDeals();
  const idx = deals.findIndex(d => d.id === deal.id);
  if (idx >= 0) deals[idx] = deal; else deals.push(deal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

export function createDeal(data: Omit<Deal, "id" | "createdAt" | "tasks" | "actionPlans" | "workstreamConfigs" | "team">): Deal {
  const deal: Deal = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tasks: [], actionPlans: {}, workstreamConfigs: [], team: [],
    planStatus: "planning",
  };
  saveDeal(deal);
  return deal;
}
