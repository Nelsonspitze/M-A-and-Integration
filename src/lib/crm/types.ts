import { IntegrationStrategy } from "@/lib/pmi/library";

export type CRMStage =
  | "prospect"
  | "qualified"
  | "contacted"
  | "nda"
  | "ioi"
  | "loi"
  | "due-diligence"
  | "closed";

export type GeographyFit = "core" | "adjacent" | "stretch";
export type Priority = "high" | "medium" | "low";
export type ContactType = "call" | "email" | "meeting" | "note";

export interface ContactPerson {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface ContactEntry {
  id: string;
  date: string;
  type: ContactType;
  summary: string;
}

export interface CRMTask {
  id: string;
  stage: CRMStage;
  workstreamId: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface TargetCompany {
  id: string;
  name: string;
  stage: CRMStage;

  // Basic info
  country: string;
  city?: string;
  sector: string;
  website?: string;
  description?: string;

  // Qualification
  revenueEst?: number;       // €k
  ebitdaEst?: number;        // €k
  fte?: number;
  founded?: number;
  geographyFit: GeographyFit;
  strategyFit: IntegrationStrategy;
  professionalization: 1 | 2 | 3 | 4 | 5;

  // Stage evaluation tasks
  crmTasks: CRMTask[];

  // People & log
  contacts: ContactPerson[];
  contactLog: ContactEntry[];

  // Meta
  priority: Priority;
  notes?: string;
  stageEnteredAt: Partial<Record<CRMStage, string>>; // when each stage was entered
  dealId?: string; // set when converted to PMI deal

  createdAt: string;
  updatedAt: string;
}
