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

export type DocType = "link" | "note" | "pdf" | "excel" | "word" | "presentation" | "contract" | "financial" | "other";

export interface CRMDocument {
  id: string;
  title: string;
  type: DocType;
  url?: string;         // external link (Google Drive, SharePoint, etc.)
  content?: string;     // pasted/typed text for "note" type
  stage?: CRMStage;     // which stage it relates to
  workstreamId?: string;// which department
  notes?: string;       // internal comment
  addedAt: string;
}

export interface CRMTaskNote {
  id: string;
  content: string;
  author?: string;
  createdAt: string;
}

export type DocRequestStatus = "pending" | "received" | "cancelled";

export interface DocRequest {
  id: string;
  contactId: string;     // ContactPerson.id
  contactName: string;   // denormalised for display
  description: string;   // what you're asking for
  status: DocRequestStatus;
  docId?: string;        // CRMDocument.id once received
  requestedAt: string;
  receivedAt?: string;
}

export interface CRMTask {
  id: string;
  stage: CRMStage;
  workstreamId: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  // Editable fields
  assignee?: string;
  dueDate?: string;
  notes?: CRMTaskNote[];
  docRequests?: DocRequest[];
  isCustom?: boolean;
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

  // Document store
  documents: CRMDocument[];

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
