import { TargetCompany, CRMStage } from "./types";
import { generateStageTasks } from "./stage-tasks";

const KEY = "crm_targets";

export function getTargets(): TargetCompany[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getTarget(id: string): TargetCompany | null {
  return getTargets().find(t => t.id === id) ?? null;
}

export function saveTarget(t: TargetCompany): void {
  const all = getTargets();
  const idx = all.findIndex(x => x.id === t.id);
  const updated = { ...t, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated; else all.push(updated);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("crm-update"));
}

export function deleteTarget(id: string): void {
  const all = getTargets().filter(t => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("crm-update"));
}

export function createTarget(data: Pick<TargetCompany, "name" | "sector"> & Partial<TargetCompany>): TargetCompany {
  const now = new Date().toISOString();
  const stage = data.stage ?? "prospect";
  const t: TargetCompany = {
    country: "",
    geographyFit: "adjacent",
    strategyFit: "bolt-on",
    professionalization: 3,
    priority: "medium",
    contacts: [],
    contactLog: [],
    crmTasks: [],
    stageEnteredAt: { prospect: now },
    createdAt: now,
    updatedAt: now,
    ...data,
    id: crypto.randomUUID(),
    stage,
  };
  // Auto-generate tasks for initial stage
  if (!data.crmTasks) {
    t.crmTasks = generateStageTasks(stage);
  }
  saveTarget(t);
  return t;
}

export function advanceStage(t: TargetCompany, to: CRMStage): TargetCompany {
  const newTasks = generateStageTasks(to);
  const updated: TargetCompany = {
    ...t,
    stage: to,
    stageEnteredAt: { ...t.stageEnteredAt, [to]: new Date().toISOString() },
    crmTasks: [...(t.crmTasks ?? []), ...newTasks],
  };
  saveTarget(updated);
  return updated;
}

export const STAGES: { id: CRMStage; label: string; color: string }[] = [
  { id: "prospect",      label: "Prospect",      color: "#9CA3AF" },
  { id: "qualified",     label: "Qualified",     color: "#74A0F4" },
  { id: "contacted",     label: "Contacted",     color: "#CDADFC" },
  { id: "nda",           label: "NDA",           color: "#D4B800" },
  { id: "ioi",           label: "IOI",           color: "#FF6400" },
  { id: "loi",           label: "LOI",           color: "#F97316" },
  { id: "due-diligence", label: "Due Diligence", color: "#EF4444" },
  { id: "closed",        label: "Closed → PMI",  color: "#9AC183" },
];

export function stageIndex(s: CRMStage): number {
  return STAGES.findIndex(x => x.id === s);
}

export function nextStage(s: CRMStage): CRMStage | null {
  const i = stageIndex(s);
  return i < STAGES.length - 1 ? STAGES[i + 1].id : null;
}

export function daysInStage(t: TargetCompany): number {
  const entered = t.stageEnteredAt[t.stage];
  if (!entered) return 0;
  return Math.floor((Date.now() - new Date(entered).getTime()) / 86_400_000);
}

export function qualificationScore(t: TargetCompany): number {
  let score = 0;
  // Geography (0-25)
  score += t.geographyFit === "core" ? 25 : t.geographyFit === "adjacent" ? 15 : 5;
  // Strategy fit (0-25)
  score += t.strategyFit === "full" ? 25 : t.strategyFit === "partial" ? 20 : t.strategyFit === "bolt-on" ? 20 : 5;
  // Professionalization (0-25): scale 1-5 → 5-25
  score += t.professionalization * 5;
  // EBITDA (0-25)
  if (t.ebitdaEst) {
    score += t.ebitdaEst >= 2000 ? 25 : t.ebitdaEst >= 1000 ? 20 : t.ebitdaEst >= 500 ? 15 : t.ebitdaEst >= 200 ? 10 : 5;
  }
  return Math.min(score, 100);
}
