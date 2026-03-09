import type { VDRDocumentRequest } from "./types";

const requestsKey = (targetId: string) => `vdr_requests_${targetId}`;

export function getRequests(targetId: string): VDRDocumentRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(requestsKey(targetId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRequests(reqs: VDRDocumentRequest[], targetId: string): void {
  localStorage.setItem(requestsKey(targetId), JSON.stringify(reqs));
  window.dispatchEvent(new Event("vdr-update"));
}

export function createRequest(
  data: Omit<VDRDocumentRequest, "id" | "requestedAt" | "status">,
  targetId: string
): VDRDocumentRequest {
  const req: VDRDocumentRequest = {
    ...data, id: crypto.randomUUID(), requestedAt: new Date().toISOString(), status: "pending",
  };
  saveRequests([...getRequests(targetId), req], targetId);
  return req;
}

export function fulfillRequest(id: string, docId: string, targetId: string): void {
  saveRequests(getRequests(targetId).map(r =>
    r.id === id ? { ...r, status: "fulfilled" as const, fulfilledDocId: docId, fulfilledAt: new Date().toISOString() } : r
  ), targetId);
}

export function declineRequest(id: string, targetId: string, response?: string): void {
  saveRequests(getRequests(targetId).map(r =>
    r.id === id ? { ...r, status: "declined" as const, declinedAt: new Date().toISOString(), response } : r
  ), targetId);
}
