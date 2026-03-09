import type { VDRFolder, VDRDocument, VDRAccessEntry, VDRQuestion, VDRAccessInfo, VDRQuestionRef } from "./types";
import { DEFAULT_VDR_INDEX } from "./index-template";
import { getGrantForUser } from "./grants";
import type { AppUser } from "../auth";
import { resolvePermissions } from "../auth";

// ── Key helpers (per-target) ──────────────────────────────────────────────────

const foldersKey  = (tid: string) => `vdr_folders_${tid}`;
const docsKey     = (tid: string) => `vdr_documents_${tid}`;

// ── Folders ───────────────────────────────────────────────────────────────────

export function getFolders(targetId: string): VDRFolder[] {
  if (typeof window === "undefined") return initFolders(targetId);
  try {
    const raw = localStorage.getItem(foldersKey(targetId));
    if (!raw) return initFolders(targetId);
    return JSON.parse(raw) as VDRFolder[];
  } catch { return initFolders(targetId); }
}

function initFolders(targetId: string): VDRFolder[] {
  const now = new Date().toISOString();
  const folders: VDRFolder[] = DEFAULT_VDR_INDEX.map(f => ({ ...f, createdAt: now }));
  if (typeof window !== "undefined") {
    localStorage.setItem(foldersKey(targetId), JSON.stringify(folders));
  }
  return folders;
}

export function saveFolders(folders: VDRFolder[], targetId: string): void {
  localStorage.setItem(foldersKey(targetId), JSON.stringify(folders));
  window.dispatchEvent(new Event("vdr-update"));
}

export function createFolder(data: Omit<VDRFolder, "id" | "createdAt">, targetId: string): VDRFolder {
  const f: VDRFolder = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  saveFolders([...getFolders(targetId), f], targetId);
  return f;
}

export function deleteFolder(id: string, targetId: string): void {
  const folders = getFolders(targetId);
  const toDelete = new Set<string>();
  function collect(fid: string) {
    toDelete.add(fid);
    folders.filter(f => f.parentId === fid).forEach(f => collect(f.id));
  }
  collect(id);
  saveFolders(folders.filter(f => !toDelete.has(f.id)), targetId);
  saveDocuments(getDocuments(targetId).filter(d => !toDelete.has(d.folderId)), targetId);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function getDocuments(targetId: string): VDRDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(docsKey(targetId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveDocuments(docs: VDRDocument[], targetId: string): void {
  localStorage.setItem(docsKey(targetId), JSON.stringify(docs));
  window.dispatchEvent(new Event("vdr-update"));
}

export function getDocumentsInFolder(folderId: string, targetId: string): VDRDocument[] {
  return getDocuments(targetId).filter(d => d.folderId === folderId);
}

export function createDocument(
  data: Omit<VDRDocument, "id" | "version" | "accessLog" | "questions" | "uploadedAt">,
  targetId: string
): VDRDocument {
  const doc: VDRDocument = {
    ...data,
    id: crypto.randomUUID(),
    version: 1,
    accessLog: [],
    questions: [],
    uploadedAt: new Date().toISOString(),
  };
  saveDocuments([...getDocuments(targetId), doc], targetId);
  return doc;
}

export function updateDocument(id: string, patch: Partial<VDRDocument>, targetId: string): void {
  saveDocuments(getDocuments(targetId).map(d => d.id === id ? { ...d, ...patch } : d), targetId);
}

export function deleteDocument(id: string, targetId: string): void {
  saveDocuments(getDocuments(targetId).filter(d => d.id !== id), targetId);
}

// ── Access logging ────────────────────────────────────────────────────────────

export function logAccess(docId: string, entry: VDRAccessEntry, targetId: string): void {
  const docs = getDocuments(targetId).map(d =>
    d.id !== docId ? d : { ...d, accessLog: [...(d.accessLog ?? []), entry] }
  );
  saveDocuments(docs, targetId);
}

// ── Q&A ───────────────────────────────────────────────────────────────────────

export function addQuestion(docId: string, q: VDRQuestion, targetId: string): void {
  saveDocuments(getDocuments(targetId).map(d =>
    d.id !== docId ? d : { ...d, questions: [...(d.questions ?? []), q] }
  ), targetId);
}

export function answerQuestion(docId: string, questionId: string, answer: string, byName: string, targetId: string): void {
  saveDocuments(getDocuments(targetId).map(d => {
    if (d.id !== docId) return d;
    return {
      ...d,
      questions: d.questions.map(q => q.id === questionId
        ? { ...q, answer, answeredByName: byName, answeredAt: new Date().toISOString(), status: "answered" as const }
        : q
      ),
    };
  }), targetId);
}

// ── Resolved VDR access per user ──────────────────────────────────────────────

export function resolveVDRAccess(user: AppUser, targetId: string): VDRAccessInfo {
  const perms = resolvePermissions(user);
  const grant = getGrantForUser(user.id, targetId);

  if (perms.vdr === "admin") {
    return { effectiveLevel: "admin", folderIds: null, canUpload: true, canAnswer: true };
  }

  if (user.partyType === "buyer") {
    return {
      effectiveLevel: perms.vdr,
      folderIds: null,
      canUpload: perms.vdr === "write",
      canAnswer: perms.vdr !== "none",
    };
  }

  if (perms.vdr !== "none") {
    const folderIds = grant && grant.folderIds.length > 0 ? grant.folderIds : null;
    return {
      effectiveLevel: perms.vdr,
      folderIds,
      canUpload: perms.vdr === "write" || (grant?.canUpload ?? false),
      canAnswer: perms.vdr === "write" || (grant?.canAnswer ?? false),
    };
  }

  if (grant && grant.folderIds.length > 0) {
    return { effectiveLevel: "read", folderIds: grant.folderIds, canUpload: grant.canUpload, canAnswer: grant.canAnswer };
  }

  return { effectiveLevel: "none", folderIds: [], canUpload: false, canAnswer: false };
}

// ── All Q&As flattened (for Q&A Centre) ───────────────────────────────────────

export function getAllQuestionRefs(access: VDRAccessInfo, targetId: string): VDRQuestionRef[] {
  const docs    = getDocuments(targetId);
  const folders = getFolders(targetId);
  const refs: VDRQuestionRef[] = [];
  for (const doc of docs) {
    if (access.folderIds !== null && !access.folderIds.includes(doc.folderId)) continue;
    const folder = folders.find(f => f.id === doc.folderId);
    for (const q of doc.questions) {
      refs.push({ docId: doc.id, docTitle: doc.title, folderId: doc.folderId, folderName: folder?.name ?? "", question: q });
    }
  }
  return refs;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getVDRStats(targetId: string) {
  const docs = getDocuments(targetId);
  return {
    total:     docs.length,
    byClass: {
      "public":            docs.filter(d => d.classification === "public").length,
      "deal-confidential": docs.filter(d => d.classification === "deal-confidential").length,
      "restricted":        docs.filter(d => d.classification === "restricted").length,
      "highly-restricted": docs.filter(d => d.classification === "highly-restricted").length,
    },
    openQuestions: docs.reduce((a, d) => a + d.questions.filter(q => q.status === "open").length, 0),
    totalViews:    docs.reduce((a, d) => a + d.accessLog.filter(e => e.action === "view").length, 0),
  };
}
