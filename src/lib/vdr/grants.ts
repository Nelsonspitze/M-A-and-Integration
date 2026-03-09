import type { VDRGrant } from "./types";

const grantsKey = (targetId: string) => `vdr_grants_${targetId}`;

export function getGrants(targetId: string): VDRGrant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(grantsKey(targetId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGrants(grants: VDRGrant[], targetId: string): void {
  localStorage.setItem(grantsKey(targetId), JSON.stringify(grants));
  window.dispatchEvent(new Event("vdr-update"));
}

export function getGrantForUser(userId: string, targetId: string): VDRGrant | null {
  return getGrants(targetId).find(g => g.userId === userId) ?? null;
}

export function createGrant(data: Omit<VDRGrant, "id" | "grantedAt">, targetId: string): VDRGrant {
  const existing = getGrants(targetId).filter(g => g.userId !== data.userId);
  const grant: VDRGrant = { ...data, id: crypto.randomUUID(), grantedAt: new Date().toISOString() };
  saveGrants([...existing, grant], targetId);
  return grant;
}

export function updateGrant(id: string, patch: Partial<VDRGrant>, targetId: string): void {
  saveGrants(getGrants(targetId).map(g => g.id === id ? { ...g, ...patch } : g), targetId);
}

export function revokeGrant(id: string, targetId: string): void {
  saveGrants(getGrants(targetId).filter(g => g.id !== id), targetId);
}
