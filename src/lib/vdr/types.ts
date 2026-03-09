import type { DocClassification, PartyType, AccessLevel } from "@/lib/access/types";
import type { DocType } from "@/lib/crm/types";

export type { DocClassification, DocType };

// ── Folder ────────────────────────────────────────────────────────────────────

export interface VDRFolder {
  id: string;
  name: string;
  index: string;          // e.g. "2.3" — display order / reference
  parentId: string | null;
  description?: string;
  defaultClassification: DocClassification;
  allowedUploaderParties?: PartyType[]; // who can upload here (undefined = buyers only)
  createdAt: string;
}

// ── Document ──────────────────────────────────────────────────────────────────

export interface VDRDocument {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  type: DocType;
  classification: DocClassification;
  // Content
  url?: string;           // external link (SharePoint, Drive, etc.)
  content?: string;       // pasted text / note body
  filename?: string;      // display name for file references
  fileSize?: string;      // e.g. "2.4 MB"
  // Meta
  version: number;
  tags: string[];
  uploadedBy: string;     // userId
  uploadedByName: string;
  uploadedByParty: PartyType;
  uploadedAt: string;
  // Access control
  accessLog: VDRAccessEntry[];
  // Q&A
  questions: VDRQuestion[];
}

export interface VDRAccessEntry {
  userId: string;
  userName: string;
  partyType: PartyType;
  action: "view" | "download";
  at: string;
}

export interface VDRQuestion {
  id: string;
  question: string;
  askedBy: string;
  askedByName: string;
  askedByParty: PartyType;
  askedAt: string;
  answer?: string;
  answeredBy?: string;
  answeredByName?: string;
  answeredAt?: string;
  status: "open" | "answered" | "closed";
}

// ── VDR Access Grant ──────────────────────────────────────────────────────────

export interface VDRGrant {
  id: string;
  userId: string;
  userName: string;
  partyType: PartyType;
  folderIds: string[];   // which folders this user can access; [] = none yet
  canUpload: boolean;
  canAnswer: boolean;    // can respond to Q&A
  grantedBy: string;
  grantedByName: string;
  grantedAt: string;
}

// ── Document Request ──────────────────────────────────────────────────────────

export interface VDRDocumentRequest {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  priority: "low" | "normal" | "high" | "urgent";
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  dueDate?: string;
  status: "pending" | "fulfilled" | "declined";
  fulfilledDocId?: string;
  fulfilledAt?: string;
  declinedAt?: string;
  response?: string;
}

// ── Q&A reference (computed, not stored) ─────────────────────────────────────

export interface VDRQuestionRef {
  docId: string;
  docTitle: string;
  folderId: string;
  folderName: string;
  question: VDRQuestion;
}

// ── Resolved VDR access (computed per user) ───────────────────────────────────

export interface VDRAccessInfo {
  effectiveLevel: AccessLevel;
  folderIds: string[] | null;  // null = all folders
  canUpload: boolean;
  canAnswer: boolean;
}
