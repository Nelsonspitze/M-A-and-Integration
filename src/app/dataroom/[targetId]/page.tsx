"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { getUser, resolvePermissions, canReadDocument, getAllUsers, saveAllUsers, getParties, saveParties } from "@/lib/auth";
import { getTarget, saveTarget, STAGES } from "@/lib/crm/store";
import {
  getFolders, getDocuments, createDocument, deleteDocument,
  logAccess, addQuestion, answerQuestion, getVDRStats,
  resolveVDRAccess,
} from "@/lib/vdr/store";
import { getGrants, getGrantForUser, createGrant, updateGrant, revokeGrant } from "@/lib/vdr/grants";
import type { VDRGrant } from "@/lib/vdr/types";
import { getRequests, createRequest, fulfillRequest, declineRequest } from "@/lib/vdr/requests";
import type { VDRFolder, VDRDocument, VDRAccessInfo, VDRDocumentRequest, VDRQuestionRef } from "@/lib/vdr/types";
import type { AppUser } from "@/lib/auth";
import type { DocClassification, DocType } from "@/lib/vdr/types";
import type { TargetCompany, ContactPerson } from "@/lib/crm/types";
import {
  Lock, FolderOpen, Folder, ChevronRight, ChevronDown, ChevronLeft, Plus, X, ExternalLink,
  FileText, File, Search, Download, Eye, MessageSquare, Shield, Upload,
  CheckCircle2, Trash2, Inbox, AlertTriangle, Key, Users,
} from "lucide-react";

type VDRTab = "documents" | "qa" | "requests" | "access";

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_TYPES: DocType[] = ["link","note","pdf","excel","word","presentation","contract","financial","other"];

const TYPE_META: Record<DocType, { label: string; color: string; icon: React.ReactNode }> = {
  link:         { label: "Link",         color: "#74A0F4", icon: <ExternalLink size={13} /> },
  note:         { label: "Note",         color: "#9CA3AF", icon: <FileText size={13} /> },
  pdf:          { label: "PDF",          color: "#FF6400", icon: <File size={13} /> },
  excel:        { label: "Excel",        color: "#9AC183", icon: <File size={13} /> },
  word:         { label: "Word",         color: "#74A0F4", icon: <File size={13} /> },
  presentation: { label: "Presentation", color: "#CDADFC", icon: <File size={13} /> },
  contract:     { label: "Contract",     color: "#D4B800", icon: <File size={13} /> },
  financial:    { label: "Financial",    color: "#FF6400", icon: <File size={13} /> },
  other:        { label: "Other",        color: "#9CA3AF", icon: <File size={13} /> },
};

const CLASS_META: Record<DocClassification, { label: string; color: string; bg: string; desc: string }> = {
  "public":            { label: "Public",            color: "#9AC183", bg: "bg-[#F0FDF4]", desc: "Shareable outside deal room" },
  "deal-confidential": { label: "Confidential",      color: "#74A0F4", bg: "bg-[#EEF2FE]", desc: "All invited participants" },
  "restricted":        { label: "Restricted",        color: "#D4B800", bg: "bg-[#FFFDE6]", desc: "C-Level and above only" },
  "highly-restricted": { label: "Highly Restricted", color: "#FF6400", bg: "bg-[#FFEFE5]", desc: "M&A Admin only · GDPR sensitive" },
};

const PRIORITY_META: Record<VDRDocumentRequest["priority"], { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#9CA3AF", bg: "bg-[#F3F4F6]" },
  normal: { label: "Normal", color: "#74A0F4", bg: "bg-[#EEF2FE]" },
  high:   { label: "High",   color: "#D4B800", bg: "bg-[#FFFDE6]" },
  urgent: { label: "Urgent", color: "#FF6400", bg: "bg-[#FFEFE5]" },
};

// ── Folder tree ───────────────────────────────────────────────────────────────

function FolderTree({ folders, docCounts, selectedId, onSelect, accessibleFolderIds }: {
  folders: VDRFolder[]; docCounts: Record<string, number>; selectedId: string | null;
  onSelect: (id: string) => void; accessibleFolderIds: string[] | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const roots = folders.filter(f => f.parentId === null).sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true }));

  function toggle(id: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function renderFolder(f: VDRFolder, depth = 0): React.ReactNode {
    const children   = folders.filter(c => c.parentId === f.id).sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true }));
    const isOpen     = !collapsed.has(f.id);
    const count      = docCounts[f.id] ?? 0;
    const isSelected = selectedId === f.id;
    const accessible = accessibleFolderIds === null || accessibleFolderIds.includes(f.id);

    return (
      <div key={f.id}>
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${!accessible ? "opacity-30 cursor-not-allowed" : isSelected ? "bg-[#FFEFE5] text-[#FF6400]" : "hover:bg-[#F9FAFB] text-[#374151]"}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }} onClick={() => accessible && onSelect(f.id)}>
          {children.length > 0 ? (
            <button onClick={e => { e.stopPropagation(); toggle(f.id); }} className="shrink-0 text-[#9CA3AF]">
              {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          ) : <span className="w-3 shrink-0" />}
          {isOpen && children.length > 0
            ? <FolderOpen size={13} className={isSelected ? "text-[#FF6400]" : "text-[#9CA3AF]"} />
            : <Folder    size={13} className={isSelected ? "text-[#FF6400]" : "text-[#9CA3AF]"} />}
          <span className="text-[11px] flex-1 truncate font-medium">{f.index} {f.name}</span>
          {count > 0 && <span className="text-[9px] font-mono text-[#9CA3AF] shrink-0">{count}</span>}
          {!accessible && <Lock size={9} className="shrink-0 text-[#D1D5DB]" />}
        </div>
        {isOpen && children.map(c => renderFolder(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">Index</p>
      </div>
      <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-0.5">
        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${!selectedId ? "bg-[#FFEFE5] text-[#FF6400]" : "hover:bg-[#F9FAFB] text-[#374151]"}`}
          onClick={() => onSelect("")}>
          <span className="w-3 shrink-0" /><FolderOpen size={13} className={!selectedId ? "text-[#FF6400]" : "text-[#9CA3AF]"} />
          <span className="text-[11px] font-medium">All documents</span>
        </div>
        {roots.map(f => renderFolder(f))}
      </div>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ folder, targetId, onClose, onSave }: {
  folder: VDRFolder; targetId: string; onClose: () => void;
  onSave: (data: Parameters<typeof createDocument>[0], targetId: string) => void;
}) {
  const user = getUser();
  const [type, setType]                   = useState<DocType>("link");
  const [title, setTitle]                 = useState("");
  const [desc, setDesc]                   = useState("");
  const [url, setUrl]                     = useState("");
  const [content, setContent]             = useState("");
  const [filename, setFilename]           = useState("");
  const [fileSize, setFileSize]           = useState("");
  const [classification, setClass]        = useState<DocClassification>(folder.defaultClassification);
  const [tags, setTags]                   = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ folderId: folder.id, title: title.trim(), description: desc.trim() || undefined, type, classification,
      url: url.trim() || undefined, content: content.trim() || undefined, filename: filename.trim() || undefined,
      fileSize: fileSize.trim() || undefined, tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      uploadedBy: user.id, uploadedByName: user.name, uploadedByParty: user.partyType }, targetId);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[440px] bg-white h-full flex flex-col shadow-xl border-l border-[#E5E7EB]">
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF]">{folder.index} {folder.name}</p>
            <h2 className="text-lg font-light text-[#242C2D] mt-0.5">Add document</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#9CA3AF]" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DOC_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${type === t ? "border-[#FF6400]/40 bg-[#FFEFE5] text-[#FF6400]" : "border-[#E5E7EB] text-[#6B7280]"}`}>
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Document title"
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB] resize-none"
              placeholder="Brief description…" />
          </div>
          {type === "note" ? (
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6}
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB] resize-none font-mono"
                placeholder="Paste note content…" />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">
                  {type === "link" ? "URL *" : "Link to file"}
                </label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
              </div>
              {type !== "link" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Filename</label>
                    <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="file.pdf"
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Size</label>
                    <input value={fileSize} onChange={e => setFileSize(e.target.value)} placeholder="2.4 MB"
                      className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-2">Classification</label>
            <div className="space-y-1.5">
              {(["public","deal-confidential","restricted","highly-restricted"] as DocClassification[]).map(c => {
                const m = CLASS_META[c];
                return (
                  <button key={c} type="button" onClick={() => setClass(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${classification === c ? m.bg : "border-[#E5E7EB]"}`}
                    style={classification === c ? { borderColor: `${m.color}30` } : {}}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <div>
                      <p className="text-xs font-medium text-[#242C2D]">{m.label}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{m.desc}</p>
                    </div>
                    {classification === c && <CheckCircle2 size={14} className="ml-auto shrink-0" style={{ color: m.color }} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="finance, audit (comma-separated)"
              className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 sf-gradient text-white text-sm font-medium py-2.5 rounded-xl hover:opacity-90 transition-opacity">Add document</button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#6B7280]">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Doc detail panel ──────────────────────────────────────────────────────────

function DocPanel({ doc, folder, targetId, onClose, onDelete, onReload }: {
  doc: VDRDocument; folder?: VDRFolder; targetId: string;
  onClose: () => void; onDelete: () => void; onReload: () => void;
}) {
  const user  = getUser();
  const perms = resolvePermissions(user);
  const grant = getGrantForUser(user.id, targetId);
  const isAdmin = perms.vdr === "admin" || perms.vdr === "write" || (grant?.canAnswer ?? false) || doc.uploadedBy === user.id;

  const [tab, setTab]               = useState<"view"|"log"|"qa">("view");
  const [question, setQuestion]     = useState("");
  const [answerText, setAnswerText] = useState<Record<string, string>>({});

  const cm = CLASS_META[doc.classification ?? "deal-confidential"];
  const tm = TYPE_META[doc.type];

  function handleView() {
    logAccess(doc.id, { userId: user.id, userName: user.name, partyType: user.partyType, action: "view", at: new Date().toISOString() }, targetId);
    onReload();
  }
  function handleDownload() {
    if (doc.url) window.open(doc.url, "_blank");
    logAccess(doc.id, { userId: user.id, userName: user.name, partyType: user.partyType, action: "download", at: new Date().toISOString() }, targetId);
    onReload();
  }
  function submitQuestion() {
    if (!question.trim()) return;
    addQuestion(doc.id, { id: crypto.randomUUID(), question: question.trim(), askedBy: user.id, askedByName: user.name, askedByParty: user.partyType, askedAt: new Date().toISOString(), status: "open" }, targetId);
    setQuestion(""); onReload();
  }
  function submitAnswer(qId: string) {
    const text = answerText[qId];
    if (!text?.trim()) return;
    answerQuestion(doc.id, qId, text.trim(), user.name, targetId);
    setAnswerText(prev => { const n = {...prev}; delete n[qId]; return n; });
    onReload();
  }

  return (
    <div className="w-[380px] shrink-0 border-l border-[#E5E7EB] bg-white flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: tm.color }}>{tm.icon}</span>
              <span className="text-[10px] font-mono text-[#9CA3AF]">{tm.label}</span>
              {folder && <><span className="text-[#D1D5DB]">·</span><span className="text-[10px] font-mono text-[#9CA3AF] truncate">{folder.index} {folder.name}</span></>}
            </div>
            <h3 className="text-sm font-semibold text-[#242C2D] leading-tight">{doc.title}</h3>
            {doc.description && <p className="text-xs text-[#6B7280] mt-0.5">{doc.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            {isAdmin && <button onClick={onDelete} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg hover:bg-[#FEF2F2] transition-colors"><Trash2 size={13} /></button>}
            <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-[#374151] rounded-lg hover:bg-[#F9FAFB] transition-colors"><X size={13} /></button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleView} className="flex items-center gap-1.5 flex-1 justify-center text-[11px] font-medium px-3 py-2 rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
            <Eye size={12} /> View
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 flex-1 justify-center text-[11px] font-medium px-3 py-2 rounded-xl bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors">
            <Download size={12} /> Download
          </button>
        </div>
      </div>

      <div className="flex border-b border-[#E5E7EB] shrink-0">
        {([["view","Info"],["log","Access"],["qa","Q&A"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 text-[11px] font-medium transition-colors border-b-2 -mb-px ${tab === k ? "border-[#FF6400] text-[#FF6400]" : "border-transparent text-[#9CA3AF] hover:text-[#374151]"}`}>
            {l}{k === "qa" && (doc.questions ?? []).filter(q => q.status === "open").length > 0 && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#FF6400] inline-block" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "view" && (
          <div className="p-5 space-y-4">
            <span className={`text-[10px] font-mono px-2 py-1 rounded-full flex items-center gap-1.5 w-fit ${cm.bg}`} style={{ color: cm.color }}>
              <Shield size={9} /> {cm.label}
            </span>
            {doc.content && <div className="bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] p-3"><pre className="text-xs text-[#374151] whitespace-pre-wrap font-sans">{doc.content}</pre></div>}
            {doc.url && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#EEF2FE]/50 rounded-xl border border-[#74A0F4]/20">
                <ExternalLink size={12} className="text-[#74A0F4] shrink-0" />
                <p className="text-[11px] text-[#74A0F4] truncate">{doc.url}</p>
              </div>
            )}
            {doc.tags?.length > 0 && <div className="flex flex-wrap gap-1">{doc.tags.map(t => <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{t}</span>)}</div>}
            <div className="border-t border-[#F3F4F6] pt-3 space-y-1.5">
              {[["Uploaded by", `${doc.uploadedByName} (${doc.uploadedByParty})`],["Date", new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],["Version", `v${doc.version}`]].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-[10px] text-[#9CA3AF]">{l}</span>
                  <span className="text-[10px] font-mono text-[#374151]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "log" && (
          <div className="p-5">
            {!(doc.accessLog ?? []).length ? <p className="text-xs text-[#9CA3AF] text-center py-8">No access recorded yet.</p> : (
              <div className="space-y-2">
                {[...(doc.accessLog ?? [])].reverse().map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#F3F4F6]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${e.action === "download" ? "bg-[#F0FDF4]" : "bg-[#EEF2FE]"}`}>
                      {e.action === "download" ? <Download size={10} className="text-[#9AC183]" /> : <Eye size={10} className="text-[#74A0F4]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#242C2D] truncate">{e.userName}</p>
                      <p className="text-[10px] font-mono text-[#9CA3AF]">{e.partyType} · {e.action}</p>
                    </div>
                    <span className="text-[9px] font-mono text-[#D1D5DB] shrink-0">{new Date(e.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "qa" && (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-2">Ask a question</p>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3} placeholder="Ask a question…"
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB] resize-none" />
              <button onClick={submitQuestion} disabled={!question.trim()}
                className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#242C2D] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                Submit
              </button>
            </div>
            <div className="space-y-3">
              {!(doc.questions ?? []).length ? <p className="text-xs text-[#9CA3AF] text-center py-4">No questions yet.</p> :
                [...(doc.questions ?? [])].reverse().map(q => (
                  <div key={q.id} className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                    <div className="px-3 py-2.5 bg-[#FAFAFA]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${q.status === "answered" ? "bg-[#F0FDF4] text-[#9AC183]" : "bg-[#FFEFE5] text-[#FF6400]"}`}>{q.status}</span>
                        <span className="text-[10px] font-mono text-[#9CA3AF]">{q.askedByName}</span>
                      </div>
                      <p className="text-xs text-[#374151]">{q.question}</p>
                    </div>
                    {q.answer ? (
                      <div className="px-3 py-2.5 border-t border-[#E5E7EB]">
                        <p className="text-[10px] font-mono text-[#9AC183] mb-1">{q.answeredByName}</p>
                        <p className="text-xs text-[#374151]">{q.answer}</p>
                      </div>
                    ) : isAdmin && (
                      <div className="px-3 py-2.5 border-t border-[#E5E7EB]">
                        <textarea value={answerText[q.id] ?? ""} onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))} rows={2} placeholder="Write an answer…"
                          className="w-full border border-[#E5E7EB] rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-[#9AC183]/50 placeholder:text-[#D1D5DB] resize-none" />
                        <button onClick={() => submitAnswer(q.id)} disabled={!answerText[q.id]?.trim()}
                          className="mt-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#9AC183] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                          Post answer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Q&A Centre ────────────────────────────────────────────────────────────────

function QACenterPanel({ docs, folders, targetId, vdrAccess, onReload }: {
  docs: VDRDocument[]; folders: VDRFolder[]; targetId: string; vdrAccess: VDRAccessInfo; onReload: () => void;
}) {
  const user  = getUser();
  const perms = resolvePermissions(user);
  const [filter, setFilter]           = useState<"open"|"answered"|"all"|"mine">("open");
  const [search, setSearch]           = useState("");
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const allRefs: VDRQuestionRef[] = docs.flatMap(doc => {
    const folder = folders.find(f => f.id === doc.folderId);
    return (doc.questions ?? []).map(q => ({ docId: doc.id, docTitle: doc.title, folderId: doc.folderId, folderName: folder?.name ?? "", question: q }));
  });

  const visible = allRefs.filter(ref => {
    if (filter === "open")     return ref.question.status === "open";
    if (filter === "answered") return ref.question.status !== "open";
    if (filter === "mine")     return user.partyType === "seller" ? docs.find(d => d.id === ref.docId)?.uploadedByParty === "seller" : ref.question.askedBy === user.id;
    return true;
  }).filter(ref => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ref.question.question.toLowerCase().includes(q) || ref.docTitle.toLowerCase().includes(q);
  });

  function canAnswer(ref: VDRQuestionRef): boolean {
    if (perms.vdr === "admin") return true;
    if (vdrAccess.canAnswer) return true;
    return docs.find(d => d.id === ref.docId)?.uploadedBy === user.id;
  }

  function submitAnswer(docId: string, qId: string) {
    const text = answerDraft[qId];
    if (!text?.trim()) return;
    answerQuestion(docId, qId, text.trim(), user.name, targetId);
    setAnswerDraft(prev => { const n = {...prev}; delete n[qId]; return n; });
    onReload();
  }

  const openCount = allRefs.filter(r => r.question.status === "open").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 pt-8 pb-20">
        <div className="mb-6">
          <h2 className="text-2xl font-light text-[#242C2D]">Q&A Centre</h2>
          <p className="text-xs text-[#9CA3AF] mt-1">{openCount} open · {allRefs.length} total</p>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex gap-1">
            {(["open","answered","all","mine"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`h-8 px-3 text-[10px] font-mono rounded-lg border transition-all capitalize ${filter === f ? "border-[#FF6400]/40 bg-[#FFEFE5] text-[#FF6400]" : "border-[#E5E7EB] text-[#9CA3AF]"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 flex items-center gap-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-3 py-2">
            <Search size={13} className="text-[#9CA3AF] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
              className="flex-1 text-xs bg-transparent placeholder:text-[#D1D5DB] focus:outline-none" />
          </div>
        </div>
        {visible.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={28} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#374151]">No questions here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(ref => {
              const q = ref.question;
              const canAns = canAnswer(ref) && q.status === "open";
              return (
                <div key={`${ref.docId}-${q.id}`} className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
                  <div className="px-4 py-2 bg-[#FAFAFA] border-b border-[#F3F4F6] flex items-center gap-2">
                    <Folder size={10} className="text-[#9CA3AF] shrink-0" />
                    <span className="text-[9px] font-mono text-[#9CA3AF]">{ref.folderName}</span>
                    <ChevronRight size={9} className="text-[#D1D5DB]" />
                    <span className="text-[9px] font-mono text-[#6B7280] truncate flex-1">{ref.docTitle}</span>
                    <span className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full ${q.status === "open" ? "bg-[#FFEFE5] text-[#FF6400]" : "bg-[#F0FDF4] text-[#9AC183]"}`}>{q.status}</span>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#EEF2FE] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-medium text-[#74A0F4]">{q.askedByName.split(" ").map(n => n[0]).join("").slice(0,2)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#242C2D]">{q.askedByName}</span>
                          <span className="text-[9px] font-mono text-[#D1D5DB]">{new Date(q.askedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        </div>
                        <p className="text-sm text-[#374151] leading-relaxed">{q.question}</p>
                      </div>
                    </div>
                    {q.answer && (
                      <div className="mt-3 ml-9 px-3 py-2.5 bg-[#F0FDF4] rounded-xl border border-[#9AC183]/20">
                        <p className="text-[10px] font-mono text-[#9AC183] mb-1">{q.answeredByName}</p>
                        <p className="text-xs text-[#374151]">{q.answer}</p>
                      </div>
                    )}
                    {canAns && (
                      <div className="mt-3 ml-9">
                        <textarea value={answerDraft[q.id] ?? ""} onChange={e => setAnswerDraft(prev => ({ ...prev, [q.id]: e.target.value }))} rows={2} placeholder="Write your answer…"
                          className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#9AC183]/50 placeholder:text-[#D1D5DB] resize-none" />
                        <button onClick={() => submitAnswer(ref.docId, q.id)} disabled={!answerDraft[q.id]?.trim()}
                          className="mt-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#9AC183] text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
                          Post answer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Requests panel ────────────────────────────────────────────────────────────

function RequestsPanel({ vdrAccess, folders, targetId, onReload }: {
  vdrAccess: VDRAccessInfo; folders: VDRFolder[]; targetId: string; onReload: () => void;
}) {
  const user    = getUser();
  const isAdmin = user.role === "buyer:ma-admin";
  const [requests, setRequests]       = useState<VDRDocumentRequest[]>([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState<VDRDocumentRequest | null>(null);
  const [declineId, setDeclineId]     = useState<string | null>(null);
  const [declineText, setDeclineText] = useState("");
  const [newFolder, setNewFolder]     = useState(folders[0]?.id ?? "");
  const [newTitle, setNewTitle]       = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newPri, setNewPri]           = useState<VDRDocumentRequest["priority"]>("normal");
  const [newDue, setNewDue]           = useState("");

  function load() {
    const all = getRequests(targetId);
    setRequests(isAdmin ? all : all.filter(r => vdrAccess.folderIds === null || vdrAccess.folderIds.includes(r.folderId)));
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createRequest({ folderId: newFolder, title: newTitle.trim(), description: newDesc.trim() || undefined, priority: newPri, dueDate: newDue || undefined, requestedBy: user.id, requestedByName: user.name }, targetId);
    setNewTitle(""); setNewDesc(""); setShowCreate(false); load();
  }

  function handleDecline() {
    if (!declineId) return;
    declineRequest(declineId, targetId, declineText.trim() || undefined);
    setDeclineId(null); setDeclineText(""); load(); onReload();
  }

  const pending = requests.filter(r => r.status === "pending");
  const closed  = requests.filter(r => r.status !== "pending");
  const fulfillFolder = fulfillTarget ? folders.find(f => f.id === fulfillTarget.folderId) : undefined;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 pt-8 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-light text-[#242C2D]">Document Requests</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">{pending.length} pending · {closed.length} closed</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl sf-gradient text-white hover:opacity-90 transition-opacity">
              <Plus size={12} /> New request
            </button>
          )}
        </div>

        {showCreate && (
          <div className="mb-6 bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-[#242C2D]">New document request</p>
              <button onClick={() => setShowCreate(false)}><X size={14} className="text-[#9CA3AF]" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Folder</label>
                <select value={newFolder} onChange={e => setNewFolder(e.target.value)} className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white">
                  {folders.map(f => <option key={f.id} value={f.id}>{f.index} {f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Document needed *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} required placeholder="e.g. FY2023 Audited Accounts"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB]" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Details</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} placeholder="Additional context…"
                  className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6400]/50 placeholder:text-[#D1D5DB] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Priority</label>
                  <select value={newPri} onChange={e => setNewPri(e.target.value as typeof newPri)} className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white">
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] block mb-1.5">Due date</label>
                  <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="text-xs font-medium px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280]">Cancel</button>
                <button type="submit" className="text-xs font-medium px-3 py-2 rounded-xl bg-[#242C2D] text-white hover:opacity-90 transition-opacity">Create request</button>
              </div>
            </form>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Pending</p>
            <div className="space-y-3">
              {pending.map(req => {
                const folder   = folders.find(f => f.id === req.folderId);
                const pm       = PRIORITY_META[req.priority];
                const isOverdue = req.dueDate && new Date(req.dueDate) < new Date();
                return (
                  <div key={req.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${pm.bg}`} style={{ color: pm.color }}>{pm.label}</span>
                          {isOverdue && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#FFEFE5] text-[#FF6400] flex items-center gap-0.5"><AlertTriangle size={8} /> Overdue</span>}
                          {folder && <span className="text-[9px] font-mono text-[#9CA3AF]">{folder.name}</span>}
                        </div>
                        <p className="text-sm font-medium text-[#242C2D]">{req.title}</p>
                        {req.description && <p className="text-xs text-[#6B7280] mt-0.5">{req.description}</p>}
                        <p className="text-[10px] font-mono text-[#9CA3AF] mt-2">By {req.requestedByName} · {new Date(req.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      </div>
                      {!isAdmin && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setFulfillTarget(req)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#9AC183] text-white hover:opacity-90 transition-opacity">Upload</button>
                          <button onClick={() => setDeclineId(req.id)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]">Decline</button>
                        </div>
                      )}
                    </div>
                    {declineId === req.id && (
                      <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
                        <textarea value={declineText} onChange={e => setDeclineText(e.target.value)} rows={2} placeholder="Reason (optional)…"
                          className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none placeholder:text-[#D1D5DB] resize-none" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={handleDecline} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#374151] text-white">Confirm decline</button>
                          <button onClick={() => setDeclineId(null)} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {closed.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-3">Closed</p>
            <div className="space-y-2">
              {closed.map(req => {
                const folder = folders.find(f => f.id === req.folderId);
                return (
                  <div key={req.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${req.status === "fulfilled" ? "bg-[#9AC183]" : "bg-[#9CA3AF]"}`} />
                    <div>
                      <p className="text-sm text-[#374151]">{req.title}</p>
                      <p className="text-[9px] font-mono text-[#D1D5DB] mt-0.5">{folder?.name} · {req.status === "fulfilled" ? "Fulfilled" : "Declined"}{req.response ? ` · ${req.response}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="text-center py-16">
            <Inbox size={28} className="text-[#E5E7EB] mx-auto mb-3" />
            <p className="text-sm text-[#374151]">No document requests</p>
            <p className="text-xs text-[#9CA3AF] mt-1">{isAdmin ? "Create a request to ask sellers for specific documents." : "No documents have been requested from you yet."}</p>
          </div>
        )}
      </div>

      {fulfillTarget && fulfillFolder && (
        <UploadModal
          folder={fulfillFolder} targetId={targetId}
          onClose={() => setFulfillTarget(null)}
          onSave={(data, tid) => {
            const doc = createDocument(data, tid);
            fulfillRequest(fulfillTarget.id, doc.id, targetId);
            setFulfillTarget(null); load(); onReload();
          }}
        />
      )}
    </div>
  );
}

// ── Access grants panel (admin only) ─────────────────────────────────────────

type GrantMode = "contact" | "new";

function AccessPanel({ targetId, folders }: { targetId: string; folders: VDRFolder[] }) {
  const [grants, setGrants]             = useState<VDRGrant[]>([]);
  const [allUsers, setAllUsers]         = useState<AppUser[]>([]);
  const [crmTarget, setCrmTarget]       = useState<TargetCompany | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [mode, setMode]                 = useState<GrantMode>("contact");
  // contact mode
  const [grantUserId, setGrantUserId]   = useState("");
  // new person mode
  const [newName, setNewName]           = useState("");
  const [newEmail, setNewEmail]         = useState("");
  const [newRole, setNewRole]           = useState("");
  // shared
  const [grantFolders, setGrantFolders] = useState<string[]>([]);
  const [grantUpload, setGrantUpload]   = useState(false);
  const [grantAnswer, setGrantAnswer]   = useState(true);

  const rootFolders = folders.filter(f => f.parentId === null).sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true }));

  function load() {
    setGrants(getGrants(targetId));
    setAllUsers(getAllUsers());
    setCrmTarget(getTarget(targetId));
  }
  useEffect(() => { load(); }, [targetId]);

  const grantedIds   = new Set(grants.map(g => g.userId));
  const currentUser  = getUser();
  const crmContacts  = crmTarget?.contacts ?? [];

  // CRM contacts that already have a linked platform account
  const linkedContacts = crmContacts.filter(c => c.linkedUserId);
  // CRM contacts without a platform account yet
  const unlinkadContacts = crmContacts.filter(c => !c.linkedUserId);
  // Platform users (non-buyer) not in CRM contacts at all
  const otherUsers = allUsers.filter(u =>
    u.partyType !== "buyer" && !crmContacts.some(c => c.linkedUserId === u.id)
  );

  function grantAccess(userId: string, userName: string, partyType: "seller" | "advisor") {
    createGrant({
      userId, userName, partyType,
      folderIds: grantFolders, canUpload: grantUpload, canAnswer: grantAnswer,
      grantedBy: currentUser.id, grantedByName: currentUser.name,
    }, targetId);
    setGrantUserId(""); setGrantFolders([]); setGrantUpload(false); setGrantAnswer(true);
    setShowAdd(false); load();
  }

  function handleGrantExisting() {
    if (!grantUserId) return;
    // Could be a linked user id, an existing platform user id, or a CRM contact id (unlinked)
    const existingUser = allUsers.find(u => u.id === grantUserId);
    if (existingUser) {
      grantAccess(existingUser.id, existingUser.name, existingUser.partyType as "seller" | "advisor");
      return;
    }
    // It's an unlinked CRM contact — create a platform user + link
    const contact = unlinkadContacts.find(c => c.id === grantUserId);
    if (!contact || !crmTarget) return;
    const parties = getParties();
    const partyId = `party-${crmTarget.id}`;
    if (!parties.find(p => p.id === partyId)) {
      saveParties([...parties, { id: partyId, name: crmTarget.name, type: "seller" }]);
    }
    const newUser: AppUser = {
      id: crypto.randomUUID(), name: contact.name, email: contact.email,
      partyId, partyType: "seller", role: "seller:mgmt-lead",
    };
    const users = getAllUsers();
    saveAllUsers([...users, newUser]);
    // Link back to CRM contact
    saveTarget({
      ...crmTarget,
      contacts: crmTarget.contacts.map(c => c.id === contact.id ? { ...c, linkedUserId: newUser.id } : c),
    });
    grantAccess(newUser.id, newUser.name, "seller");
  }

  function handleGrantNew() {
    if (!newName.trim() || !crmTarget) return;
    const parties = getParties();
    const partyId = `party-${crmTarget.id}`;
    if (!parties.find(p => p.id === partyId)) {
      saveParties([...parties, { id: partyId, name: crmTarget.name, type: "seller" }]);
    }
    const newUser: AppUser = {
      id: crypto.randomUUID(), name: newName.trim(), email: newEmail.trim() || undefined,
      partyId, partyType: "seller", role: "seller:mgmt-lead",
    };
    const users = getAllUsers();
    saveAllUsers([...users, newUser]);
    // Also add as CRM contact
    const contact: ContactPerson = {
      id: crypto.randomUUID(), name: newName.trim(), role: newRole.trim() || "Contact",
      email: newEmail.trim() || undefined, linkedUserId: newUser.id,
    };
    saveTarget({ ...crmTarget, contacts: [...crmTarget.contacts, contact] });
    setNewName(""); setNewEmail(""); setNewRole("");
    grantAccess(newUser.id, newUser.name, "seller");
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#9CA3AF] mb-1">Access Management</p>
          <h2 className="text-base font-semibold text-[#242C2D]">Dataroom access grants</h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Grant sellers and advisors access to sections of this dataroom.</p>
        </div>
        <button onClick={() => { setShowAdd(v => !v); setMode("contact"); }}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl sf-gradient text-white hover:opacity-90 transition-opacity">
          <Plus size={12} /> Add grant
        </button>
      </div>

      {showAdd && (
        <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB] space-y-3 mb-5">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#F3F4F6] rounded-lg p-0.5 w-fit">
            {([["contact", "From contacts"], ["new", "New person"]] as [GrantMode, string][]).map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${mode === m ? "bg-white text-[#242C2D] shadow-sm" : "text-[#9CA3AF]"}`}>
                {label}
              </button>
            ))}
          </div>

          {mode === "contact" ? (
            <div>
              <label className="text-[10px] font-mono text-[#9CA3AF] block mb-1">
                Select person {crmTarget ? `— contacts of ${crmTarget.name}` : ""}
              </label>
              <select value={grantUserId} onChange={e => setGrantUserId(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151]">
                <option value="">Choose…</option>
                {(linkedContacts.length > 0 || unlinkadContacts.length > 0) && (
                  <optgroup label={`${crmTarget?.name ?? "CRM"} contacts`}>
                    {linkedContacts.map(c => {
                      const u = allUsers.find(u => u.id === c.linkedUserId);
                      if (!u) return null;
                      return (
                        <option key={u.id} value={u.id}>
                          {c.name} · {c.role || "contact"}{grantedIds.has(u.id) ? " ✓ has access" : ""}
                        </option>
                      );
                    })}
                    {unlinkadContacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.role || "contact"} — invite to platform
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherUsers.length > 0 && (
                  <optgroup label="Other platform users">
                    {otherUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.partyType}){grantedIds.has(u.id) ? " ✓ has access" : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {grantUserId && unlinkadContacts.some(c => c.id === grantUserId) && (
                <p className="text-[10px] text-[#FF6400] mt-1 font-mono">A platform account will be created for this contact.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-[#9CA3AF] block mb-1">Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name"
                    className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6400]/40" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#9CA3AF] block mb-1">Role at company</label>
                  <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. CFO"
                    className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6400]/40" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#9CA3AF] block mb-1">Email</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@company.com" type="email"
                  className="w-full h-8 text-xs rounded-lg border border-[#E5E7EB] bg-white px-2 text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#FF6400]/40" />
              </div>
              <p className="text-[10px] text-[#9CA3AF] font-mono">This person will be added as a CRM contact and given a seller platform account.</p>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono text-[#9CA3AF] block mb-1">Accessible sections (leave blank for all)</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {rootFolders.map(f => (
                <label key={f.id} className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer">
                  <input type="checkbox" checked={grantFolders.includes(f.id)}
                    onChange={e => setGrantFolders(prev => e.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id))}
                    className="w-3 h-3" />
                  <span className="truncate">{f.index} {f.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer">
              <input type="checkbox" checked={grantUpload} onChange={e => setGrantUpload(e.target.checked)} className="w-3 h-3" />
              Allow upload
            </label>
            <label className="flex items-center gap-2 text-xs text-[#374151] cursor-pointer">
              <input type="checkbox" checked={grantAnswer} onChange={e => setGrantAnswer(e.target.checked)} className="w-3 h-3" />
              Allow Q&A answers
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={mode === "contact" ? handleGrantExisting : handleGrantNew}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FF6400] text-white hover:opacity-90 transition-opacity">
              Grant access
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs text-[#9CA3AF] hover:text-[#374151] px-2 py-1.5 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {grants.length === 0 && !showAdd ? (
        <div className="border border-dashed border-[#E5E7EB] rounded-xl p-10 text-center">
          <Key size={22} className="text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm text-[#374151]">No access grants yet</p>
          <p className="text-xs text-[#9CA3AF] mt-1">External users need a grant to view this dataroom.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grants.map(g => (
            <div key={g.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0 text-[11px] font-medium text-[#6B7280]">
                  {g.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#242C2D]">{g.userName}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${g.partyType === "seller" ? "bg-[#EEF2FE] text-[#74A0F4]" : "bg-[#F0FDF4] text-[#9AC183]"}`}>{g.partyType}</span>
                    {crmContacts.some(c => c.linkedUserId === g.userId) && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#9CA3AF]">CRM contact</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {g.folderIds.length === 0
                      ? <span className="text-[10px] font-mono text-[#9AC183]">All sections</span>
                      : g.folderIds.map(fid => {
                          const f = rootFolders.find(f => f.id === fid);
                          return f ? <span key={fid} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{f.index} {f.name}</span> : null;
                        })
                    }
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-[#9CA3AF]">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={g.canUpload}
                        onChange={e => { updateGrant(g.id, { canUpload: e.target.checked }, targetId); load(); }}
                        className="w-3 h-3" />
                      Upload
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={g.canAnswer}
                        onChange={e => { updateGrant(g.id, { canAnswer: e.target.checked }, targetId); load(); }}
                        className="w-3 h-3" />
                      Answer Q&A
                    </label>
                    <span className="text-[#D1D5DB]">Granted {new Date(g.grantedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <button onClick={() => { revokeGrant(g.id, targetId); load(); }}
                  className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors rounded-lg hover:bg-red-50">
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TargetVDRPage() {
  const params   = useParams();
  const targetId = params.targetId as string;

  const [target, setTarget]                 = useState<TargetCompany | null>(null);
  const [activeTab, setActiveTab]           = useState<VDRTab>("documents");
  const [folders, setFolders]               = useState<VDRFolder[]>([]);
  const [docs, setDocs]                     = useState<VDRDocument[]>([]);
  const [vdrAccess, setVdrAccess]           = useState<VDRAccessInfo>({ effectiveLevel: "none", folderIds: [], canUpload: false, canAnswer: false });
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedDoc, setSelectedDoc]       = useState<VDRDocument | null>(null);
  const [showUpload, setShowUpload]         = useState(false);
  const [search, setSearch]                 = useState("");
  const [classFilter, setClassFilter]       = useState<DocClassification | "all">("all");

  const reload = useCallback(() => {
    const u      = getUser();
    const perms  = resolvePermissions(u);
    const access = resolveVDRAccess(u, targetId);
    setVdrAccess(access);
    setFolders(getFolders(targetId));
    const allDocs = getDocuments(targetId);
    const visible = allDocs.filter(d => {
      if (!canReadDocument(perms, u, d.classification ?? "deal-confidential")) return false;
      if (access.folderIds !== null && !access.folderIds.includes(d.folderId)) return false;
      return true;
    });
    setDocs(visible);
    setSelectedDoc(prev => prev ? (visible.find(d => d.id === prev.id) ?? null) : null);
  }, [targetId]);

  useEffect(() => {
    setTarget(getTarget(targetId));
    reload();
    window.addEventListener("vdr-update", reload);
    return () => window.removeEventListener("vdr-update", reload);
  }, [targetId, reload]);

  const user  = getUser();
  const perms = resolvePermissions(user);

  if (!target) return null;

  if (vdrAccess.effectiveLevel === "none" && perms.vdr === "none" && perms.dataroom === "none") {
    return (
      <div className="flex h-screen bg-[#FAFAFA]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Lock size={22} className="text-[#D1D5DB] mx-auto mb-4" />
            <p className="text-sm font-medium text-[#374151]">Access restricted</p>
            <p className="text-xs text-[#9CA3AF] mt-1">You don&apos;t have access to this dataroom.</p>
          </div>
        </main>
      </div>
    );
  }

  const stageInfo = STAGES.find(s => s.id === target.stage);
  const docCounts: Record<string, number> = {};
  for (const d of docs) { docCounts[d.folderId] = (docCounts[d.folderId] ?? 0) + 1; }

  const activeFolder = folders.find(f => f.id === selectedFolder);
  const canUpload    = vdrAccess.canUpload && !!activeFolder && (vdrAccess.folderIds === null || vdrAccess.folderIds.includes(activeFolder.id));

  const visibleDocs = docs.filter(d => {
    if (selectedFolder && d.folderId !== selectedFolder) return false;
    if (classFilter !== "all" && d.classification !== classFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.tags?.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const openQs  = docs.reduce((a, d) => a + (d.questions ?? []).filter(q => q.status === "open").length, 0);
  const stats   = getVDRStats(targetId);

  const isAdmin = perms.vdr === "admin";
  const TABS: { key: VDRTab; label: string; badge?: number }[] = [
    { key: "documents", label: "Documents" },
    { key: "qa",        label: "Q&A",      badge: openQs > 0 ? openQs : undefined },
    { key: "requests",  label: "Requests" },
    ...(isAdmin ? [{ key: "access" as VDRTab, label: "Access" }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] shrink-0">
          <div className="px-6 pt-5 pb-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dataroom" className="flex items-center gap-1 text-[10px] font-mono text-[#9CA3AF] hover:text-[#FF6400] transition-colors">
                <ChevronLeft size={11} /> Datarooms
              </Link>
            </div>
            <div className="flex items-center gap-3 pb-1">
              <h1 className="text-lg font-semibold text-[#242C2D]">{target.name}</h1>
              {stageInfo && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${stageInfo.color}20`, color: stageInfo.color }}>
                  {stageInfo.label}
                </span>
              )}
              <span className="text-[10px] font-mono text-[#9CA3AF] ml-auto capitalize">{user.partyType} · {user.name.split(" ")[0]}</span>
            </div>
          </div>
          <div className="flex items-center px-6">
            {TABS.map(({ key, label, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === key ? "border-[#FF6400] text-[#FF6400]" : "border-transparent text-[#9CA3AF] hover:text-[#374151]"}`}>
                {label}
                {badge !== undefined && <span className="h-4 min-w-4 px-1 rounded-full bg-[#FF6400] text-white text-[9px] font-mono flex items-center justify-center">{badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Documents tab */}
        {activeTab === "documents" && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-[220px] shrink-0 border-r border-[#E5E7EB] bg-white flex flex-col overflow-hidden">
              <FolderTree folders={folders} docCounts={docCounts} selectedId={selectedFolder || null}
                onSelect={id => { setSelectedFolder(id); setSelectedDoc(null); }}
                accessibleFolderIds={vdrAccess.folderIds} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E7EB] bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl px-3 py-2">
                    <Search size={13} className="text-[#9CA3AF] shrink-0" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, tags…"
                      className="flex-1 text-xs bg-transparent placeholder:text-[#D1D5DB] focus:outline-none" />
                    {search && <button onClick={() => setSearch("")}><X size={11} className="text-[#9CA3AF]" /></button>}
                  </div>
                  <div className="flex gap-1">
                    {(["all","public","deal-confidential","restricted","highly-restricted"] as (DocClassification|"all")[]).map(c => {
                      const m = c === "all" ? null : CLASS_META[c as DocClassification];
                      return (
                        <button key={c} onClick={() => setClassFilter(c)}
                          className={`h-8 px-2.5 text-[10px] font-mono rounded-lg border transition-all ${classFilter === c ? "border-[#FF6400]/40 bg-[#FFEFE5] text-[#FF6400]" : "border-[#E5E7EB] text-[#9CA3AF]"}`}>
                          {c === "all" ? "All" : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: m?.color }} />{m?.label.split(" ")[0]}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {canUpload && <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl sf-gradient text-white hover:opacity-90 transition-opacity shrink-0"><Upload size={12} /> Upload</button>}
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#9CA3AF]">
                  <button onClick={() => setSelectedFolder("")} className="hover:text-[#FF6400] transition-colors">All documents</button>
                  {activeFolder && <><ChevronRight size={10} /><span className="text-[#374151] font-medium">{activeFolder.index} {activeFolder.name}</span></>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {visibleDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8">
                    <FolderOpen size={32} className="text-[#E5E7EB] mb-3" />
                    <p className="text-sm font-medium text-[#374151] mb-1">{search ? "No documents match your search" : "No documents in this folder"}</p>
                    <p className="text-xs text-[#9CA3AF]">{canUpload && activeFolder ? "Click Upload to add the first document." : "Documents will appear here when added."}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {visibleDocs.map(doc => {
                      const tm2 = TYPE_META[doc.type];
                      const cm2 = CLASS_META[doc.classification ?? "deal-confidential"];
                      const fld = folders.find(f => f.id === doc.folderId);
                      const hasOpenQ = (doc.questions ?? []).some(q => q.status === "open");
                      const isSel = selectedDoc?.id === doc.id;
                      return (
                        <div key={doc.id} onClick={() => setSelectedDoc(isSel ? null : doc)}
                          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${isSel ? "bg-[#FFEFE5]/50" : "hover:bg-[#FAFAFA]"}`}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tm2.color}15` }}>
                            <span style={{ color: tm2.color }}>{tm2.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-medium text-[#242C2D] truncate">{doc.title}</p>
                              {hasOpenQ && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6400] shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-[#9CA3AF] flex-wrap">
                              {!selectedFolder && fld && <span>{fld.index} {fld.name} ·</span>}
                              <span>{tm2.label}</span><span>· {doc.uploadedByName}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${cm2.bg} shrink-0`} style={{ color: cm2.color }}>{cm2.label.split(" ")[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-5 py-2 border-t border-[#E5E7EB] bg-white shrink-0 flex items-center gap-4 text-[10px] font-mono text-[#9CA3AF]">
                <span>{visibleDocs.length} doc{visibleDocs.length !== 1 ? "s" : ""}</span>
                <span>· {stats.totalViews} views</span>
                {openQs > 0 && <span className="text-[#FF6400]">· {openQs} open Q&As</span>}
              </div>
            </div>
            {selectedDoc && (
              <DocPanel doc={selectedDoc} folder={folders.find(f => f.id === selectedDoc.folderId)}
                targetId={targetId} onClose={() => setSelectedDoc(null)}
                onDelete={() => { deleteDocument(selectedDoc.id, targetId); reload(); }} onReload={reload} />
            )}
          </div>
        )}

        {activeTab === "qa" && <QACenterPanel docs={docs} folders={folders} targetId={targetId} vdrAccess={vdrAccess} onReload={reload} />}
        {activeTab === "requests" && <RequestsPanel vdrAccess={vdrAccess} folders={folders} targetId={targetId} onReload={reload} />}
        {activeTab === "access" && isAdmin && <AccessPanel targetId={targetId} folders={folders} />}
      </div>

      {showUpload && activeFolder && (
        <UploadModal folder={activeFolder} targetId={targetId} onClose={() => setShowUpload(false)}
          onSave={(data, tid) => { createDocument(data, tid); reload(); setShowUpload(false); }} />
      )}
    </div>
  );
}
