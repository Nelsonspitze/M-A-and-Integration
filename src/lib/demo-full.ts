/**
 * Full platform demo — seeds CRM, VDR, users, grants, Q&A and document requests
 * across three active deals: Veritas (NDA), Meridian (IOI), Crestline (Due Diligence).
 */

import type { TargetCompany, ContactPerson } from "./crm/types";
import type { VDRDocument, VDRFolder, VDRGrant, VDRDocumentRequest } from "./vdr/types";
import type { AppUser, AppParty } from "./auth";
import { DEFAULT_VDR_INDEX } from "./vdr/index-template";
import { getTargets } from "./crm/store";
import { generateStageTasks } from "./crm/stage-tasks";
import type { CRMTask } from "./crm/types";
import { getAllUsers, saveAllUsers, getParties, saveParties } from "./auth";

// ── Marker ────────────────────────────────────────────────────────────────────

const FULL_DEMO_KEY = "full_demo_loaded_v1";

export function isFullDemoLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FULL_DEMO_KEY) === "1";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const dStr = (daysAgo: number) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString();
};
const ds = (daysAgo: number) => dStr(daysAgo).split("T")[0];
const dsFuture = (daysAhead: number) => {
  const d = new Date(); d.setDate(d.getDate() + daysAhead); return d.toISOString().split("T")[0];
};

function tasks(stage: Parameters<typeof generateStageTasks>[0], completedIds: string[] = []): CRMTask[] {
  return generateStageTasks(stage).map((t: CRMTask, i: number) => ({
    ...t,
    completed: completedIds.includes(t.workstreamId),
    completedAt: completedIds.includes(t.workstreamId) ? dStr(Math.max(1, 5 - i)) : undefined,
  }));
}

function seedFolders(targetId: string): VDRFolder[] {
  const now = new Date().toISOString();
  const folders: VDRFolder[] = DEFAULT_VDR_INDEX.map(f => ({ ...f, createdAt: now }));
  localStorage.setItem(`vdr_folders_${targetId}`, JSON.stringify(folders));
  return folders;
}

function seedDocuments(targetId: string, docs: VDRDocument[]) {
  localStorage.setItem(`vdr_documents_${targetId}`, JSON.stringify(docs));
}

function seedGrants(targetId: string, grants: VDRGrant[]) {
  localStorage.setItem(`vdr_grants_${targetId}`, JSON.stringify(grants));
}

function seedRequests(targetId: string, requests: VDRDocumentRequest[]) {
  localStorage.setItem(`vdr_requests_${targetId}`, JSON.stringify(requests));
}

// ── User IDs (predictable) ────────────────────────────────────────────────────

const USERS = {
  // Existing buyer users (from DEMO_USERS)
  marcus:  "ma1",
  // New seller users — created by this demo
  peter:   "demo-peter-devries",
  sandra:  "demo-sandra-mulder",
  rob:     "demo-rob-jansen",
  emma:    "demo-emma-hoekstra",
  lars:    "demo-lars-visser",
  michael: "demo-michael-torres",
};

// ── Main export ───────────────────────────────────────────────────────────────

export function loadFullDemo(): void {
  if (isFullDemoLoaded()) return;

  // ── 1. CRM Targets ──────────────────────────────────────────────────────────

  const veritas_id   = "crm-demo-veritas";
  const meridian_id  = "crm-demo-meridian";
  const crestline_id = "crm-demo-crestline";
  const nexora_id    = "crm-demo-nexora";
  const techbridge_id = "crm-demo-techbridge";
  const alpina_id    = "crm-demo-alpina";

  const crestlineContacts: ContactPerson[] = [
    { id: "cc1", name: "Emma Hoekstra",  role: "CEO & Founder",  email: "e.hoekstra@crestline.nl",  linkedUserId: USERS.emma  },
    { id: "cc2", name: "Lars Visser",    role: "CFO",            email: "l.visser@crestline.nl",    linkedUserId: USERS.lars  },
    { id: "cc3", name: "Nora Hendriks",  role: "COO",            email: "n.hendriks@crestline.nl"  },
  ];

  const veritasContacts: ContactPerson[] = [
    { id: "vc1", name: "Peter de Vries", role: "CEO",            email: "peter@veritas-hr.nl",       linkedUserId: USERS.peter },
    { id: "vc2", name: "Hilde Brouwer",  role: "Managing Partner", email: "h.brouwer@veritas-hr.nl" },
  ];

  const meridianContacts: ContactPerson[] = [
    { id: "mc1", name: "Sandra Mulder",  role: "CFO",            email: "s.mulder@meridiancare.nl",  linkedUserId: USERS.sandra },
    { id: "mc2", name: "Rob Jansen",     role: "CEO",            email: "r.jansen@meridiancare.nl",  linkedUserId: USERS.rob    },
    { id: "mc3", name: "Fatima el Idrissi", role: "HR Director", email: "f.elidrissi@meridiancare.nl" },
  ];

  const newTargets: TargetCompany[] = [
    // Veritas — NDA (enhanced)
    {
      id: veritas_id, name: "Veritas HR Consulting", stage: "nda",
      sector: "Business Services", country: "NL", city: "Amsterdam",
      ebitdaEst: 750, fte: 42, revenueEst: 4200, founded: 2014,
      geographyFit: "core", strategyFit: "partial", professionalization: 4,
      priority: "high",
      description: "Boutique HR consulting firm specialising in talent acquisition and organisational design. Strong client roster in financial services and technology. Founder-led, consistent 18% EBITDA margin.",
      contacts: veritasContacts,
      contactLog: [
        { id: "vl1", date: ds(42), type: "meeting", summary: "Initial intro via advisor network. Peter presented company overview. Strong cultural fit. Agreed on next steps." },
        { id: "vl2", date: ds(35), type: "call",    summary: "Follow-up call. Shared platform investment thesis. Peter receptive to buy-and-build angle." },
        { id: "vl3", date: ds(28), type: "email",   summary: "Sent teaser and LOI framework. Peter requested 2-week review period." },
        { id: "vl4", date: ds(18), type: "meeting", summary: "Management presentation — Amsterdam office. Met Hilde Brouwer (Managing Partner). Detailed P&L walkthrough." },
        { id: "vl5", date: ds(10), type: "email",   summary: "NDA circulated for signature. Also sent draft dataroom index." },
        { id: "vl6", date: ds(5),  type: "call",    summary: "NDA signed. Agreed to open dataroom next week. Peter will upload initial documents." },
      ],
      documents: [],
      crmTasks: tasks("nda", ["finance", "commercial"]),
      stageEnteredAt: { prospect: dStr(60), qualified: dStr(45), contacted: dStr(35), nda: dStr(5) },
      createdAt: dStr(60), updatedAt: dStr(5),
    },

    // Meridian — IOI (enhanced)
    {
      id: meridian_id, name: "Meridian Care Group", stage: "ioi",
      sector: "Healthcare", country: "NL", city: "Rotterdam",
      ebitdaEst: 1800, fte: 120, revenueEst: 9200, founded: 2003,
      geographyFit: "core", strategyFit: "full", professionalization: 3,
      priority: "high",
      description: "Regional home care provider serving South Holland. 120 FTEs across 4 locations. Long-term care contracts with municipalities. Platform company for healthcare buy-and-build thesis.",
      contacts: meridianContacts,
      contactLog: [
        { id: "ml1", date: ds(65), type: "meeting", summary: "First contact via healthcare sector advisor. Rob Jansen (CEO) open to strategic conversation." },
        { id: "ml2", date: ds(55), type: "call",    summary: "Introductory call — discussed market context and platform thesis. Good rapport with Rob." },
        { id: "ml3", date: ds(45), type: "meeting", summary: "Site visit Rotterdam main office. Met Sandra Mulder (CFO). Operations look solid." },
        { id: "ml4", date: ds(32), type: "email",   summary: "NDA executed. Dataroom opened. Sandra uploaded preliminary financials." },
        { id: "ml5", date: ds(25), type: "meeting", summary: "Management presentation — 3 hours. Detailed review of care contracts and municipality relationships. Some EBITDA clarifications needed." },
        { id: "ml6", date: ds(18), type: "call",    summary: "Finance deep-dive with Sandra. Discussed 2023 EBITDA decline drivers — one-time restructuring cost of €180K confirmed." },
        { id: "ml7", date: ds(8),  type: "email",   summary: "Submitted IOI at 6× EBITDA (€10.8M EV). Seller indicated they are also in discussion with one other buyer." },
        { id: "ml8", date: ds(2),  type: "call",    summary: "Rob confirmed IOI is in range. Requested final decision by end of week. Need to move quickly." },
      ],
      documents: [],
      crmTasks: tasks("ioi", ["finance", "commercial", "hr"]),
      stageEnteredAt: { prospect: dStr(80), qualified: dStr(65), contacted: dStr(55), nda: dStr(32), ioi: dStr(8) },
      createdAt: dStr(80), updatedAt: dStr(2),
    },

    // Crestline — Due Diligence (new, richest)
    {
      id: crestline_id, name: "Crestline Advisory Group", stage: "due-diligence",
      sector: "Business Services", country: "NL", city: "Amsterdam",
      ebitdaEst: 2400, fte: 85, revenueEst: 14200, founded: 2009,
      website: "https://crestlineadvisory.nl",
      geographyFit: "core", strategyFit: "partial", professionalization: 4,
      priority: "high",
      description: "Mid-market financial advisory firm. Services: M&A, restructuring, valuation. Recurring revenue base (retainers ~60%). Strong management team, low client concentration.",
      contacts: crestlineContacts,
      contactLog: [
        { id: "cl1", date: ds(120), type: "meeting", summary: "Initial outreach via mutual network. Emma Hoekstra immediately interested — had previously explored exit options." },
        { id: "cl2", date: ds(110), type: "meeting", summary: "NDA signed. Full management team presentation. Very professional setup." },
        { id: "cl3", date: ds(95),  type: "email",   summary: "IOI submitted at 5.8× EBITDA. Counter-offer received at 6.5×." },
        { id: "cl4", date: ds(85),  type: "meeting", summary: "Price negotiation round. Agreed on 6.2× EBITDA — €14.9M EV. Term sheet signed." },
        { id: "cl5", date: ds(70),  type: "email",   summary: "LOI executed. Exclusivity period: 60 days. DD commenced." },
        { id: "cl6", date: ds(55),  type: "meeting", summary: "DD kick-off meeting. Engaged external counsel (Freshfields) and Big 4 FDD team." },
        { id: "cl7", date: ds(40),  type: "call",    summary: "FDD interim call. No major issues found so far. Slight working capital question to resolve." },
        { id: "cl8", date: ds(25),  type: "meeting", summary: "Management Q&A session — 4 hours. Lars presented full financial model. Key risk: two key client concentration (28% combined)." },
        { id: "cl9", date: ds(10),  type: "call",    summary: "Legal DD ongoing. Key issue: one outstanding client dispute (€80K claim) — disclosed but needs resolution mechanism." },
        { id: "cl10", date: ds(3),  type: "email",   summary: "Draft SPA received from Freshfields. Reviewing with Marcus. Target signing in 3 weeks." },
      ],
      documents: [],
      crmTasks: tasks("due-diligence", ["finance", "commercial", "hr", "legal", "it"]),
      stageEnteredAt: { prospect: dStr(130), qualified: dStr(120), contacted: dStr(115), nda: dStr(110), ioi: dStr(95), loi: dStr(70), "due-diligence": dStr(55) },
      createdAt: dStr(130), updatedAt: dStr(3),
    },

    // Nexora — qualified (unchanged but included)
    {
      id: nexora_id, name: "Nexora Facility Services", stage: "qualified",
      sector: "Business Services", country: "NL", city: "Utrecht",
      ebitdaEst: 1200, fte: 95, revenueEst: 8500, founded: 2008,
      geographyFit: "core", strategyFit: "bolt-on", professionalization: 3,
      priority: "high", description: "Facility management company active in the Randstad area.",
      contacts: [
        { id: "nc1", name: "Joost van Dijk", role: "CEO", email: "j.vandijk@nexora.nl" },
      ],
      contactLog: [
        { id: "nl1", date: ds(20), type: "meeting", summary: "First intro meeting. Joost is open to discussing strategic options. Revenue growing ~12% YoY." },
        { id: "nl2", date: ds(10), type: "email",   summary: "Sent company overview and platform thesis. Awaiting response." },
      ],
      documents: [],
      crmTasks: tasks("qualified", ["commercial"]),
      stageEnteredAt: { prospect: dStr(30), qualified: dStr(14) },
      createdAt: dStr(30), updatedAt: dStr(14),
    },

    // TechBridge — contacted (unchanged)
    {
      id: techbridge_id, name: "TechBridge Solutions", stage: "contacted",
      sector: "Technology", country: "BE", city: "Ghent",
      ebitdaEst: 550, fte: 28, revenueEst: 3100,
      geographyFit: "adjacent", strategyFit: "bolt-on", professionalization: 4,
      priority: "medium",
      contacts: [{ id: "tc1", name: "Sven Claes", role: "Co-founder & CEO", email: "s.claes@techbridge.be" }],
      contactLog: [
        { id: "tl1", date: ds(7), type: "email", summary: "Initial outreach via LinkedIn. Positive response — Sven open to a call." },
      ],
      documents: [],
      crmTasks: tasks("contacted"),
      stageEnteredAt: { prospect: dStr(20), qualified: dStr(12), contacted: dStr(7) },
      createdAt: dStr(20), updatedAt: dStr(7),
    },

    // Alpina — prospect (unchanged)
    {
      id: alpina_id, name: "Alpina Industrials", stage: "prospect",
      sector: "Industrial", country: "DE", city: "Düsseldorf",
      ebitdaEst: 2100, fte: 180,
      geographyFit: "stretch", strategyFit: "standalone", professionalization: 2,
      priority: "low",
      contacts: [],
      contactLog: [],
      documents: [],
      crmTasks: tasks("prospect"),
      stageEnteredAt: { prospect: dStr(7) },
      createdAt: dStr(7), updatedAt: dStr(7),
    },
  ];

  // Save all CRM targets (replace existing demo targets)
  const existing = getTargets().filter(t => !newTargets.find(n => n.id === t.id));
  localStorage.setItem("crm_targets", JSON.stringify([...existing, ...newTargets]));

  // ── 2. Platform users ───────────────────────────────────────────────────────

  // Parties
  const existingParties = getParties();
  const newParties: AppParty[] = [
    { id: `party-${veritas_id}`,   name: "Veritas HR Consulting",  type: "seller"  },
    { id: `party-${meridian_id}`,  name: "Meridian Care Group",    type: "seller"  },
    { id: `party-${crestline_id}`, name: "Crestline Advisory",     type: "seller"  },
    { id: "advisor-ma",            name: "Riverton M&A Advisory",  type: "advisor" },
  ];
  const mergedParties = [
    ...existingParties.filter(p => !newParties.find(n => n.id === p.id)),
    ...newParties,
  ];
  saveParties(mergedParties);

  // Users
  const newUsers: AppUser[] = [
    { id: USERS.peter,   name: "Peter de Vries",   email: "peter@veritas-hr.nl",       partyId: `party-${veritas_id}`,   partyType: "seller",  role: "seller:mgmt-lead"  },
    { id: USERS.sandra,  name: "Sandra Mulder",    email: "s.mulder@meridiancare.nl",   partyId: `party-${meridian_id}`,  partyType: "seller",  role: "seller:mgmt-lead"  },
    { id: USERS.rob,     name: "Rob Jansen",       email: "r.jansen@meridiancare.nl",   partyId: `party-${meridian_id}`,  partyType: "seller",  role: "seller:sponsor"    },
    { id: USERS.emma,    name: "Emma Hoekstra",    email: "e.hoekstra@crestline.nl",    partyId: `party-${crestline_id}`, partyType: "seller",  role: "seller:sponsor"    },
    { id: USERS.lars,    name: "Lars Visser",      email: "l.visser@crestline.nl",      partyId: `party-${crestline_id}`, partyType: "seller",  role: "seller:mgmt-lead"  },
    { id: USERS.michael, name: "Michael Torres",   email: "m.torres@riverton-ma.com",   partyId: "advisor-ma",            partyType: "advisor", role: "advisor:lead"      },
  ];
  const existingUsers = getAllUsers();
  const mergedUsers = [
    ...existingUsers.filter(u => !newUsers.find(n => n.id === u.id)),
    ...newUsers,
  ];
  saveAllUsers(mergedUsers);

  // ── 3. Seed folders for all three VDR targets ───────────────────────────────

  seedFolders(veritas_id);
  seedFolders(meridian_id);
  seedFolders(crestline_id);

  // ── 4. Seed VDR: Veritas (NDA) ─────────────────────────────────────────────

  const vDocs: VDRDocument[] = [
    {
      id: "vd1", folderId: "f-9-1", title: "Company Overview & Investment Highlights",
      description: "Management presentation prepared for the NDA phase. Covers strategy, financials, and growth thesis.",
      type: "presentation", classification: "restricted",
      filename: "Veritas_HR_Company_Overview_2024.pptx", fileSize: "4.2 MB",
      version: 1, tags: ["management", "overview", "strategy"],
      uploadedBy: USERS.marcus, uploadedByName: "Marcus Wellington", uploadedByParty: "buyer",
      uploadedAt: dStr(4),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view", at: dStr(4) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view", at: dStr(3) },
      ],
      questions: [
        {
          id: "vq1", question: "What is the current client retention rate and how has it trended over the last 3 years?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(3), status: "open",
        },
        {
          id: "vq2", question: "Are any of the founding partners planning to exit post-transaction?",
          askedBy: "cl1", askedByName: "Sarah van den Berg", askedByParty: "buyer",
          askedAt: dStr(2), status: "open",
        },
      ],
    },
    {
      id: "vd2", folderId: "f-1-1", title: "Articles of Association — Veritas HR Consulting B.V.",
      type: "pdf", classification: "restricted",
      filename: "Veritas_AoA_2022.pdf", fileSize: "820 KB",
      version: 1, tags: ["legal", "corporate"],
      uploadedBy: USERS.peter, uploadedByName: "Peter de Vries", uploadedByParty: "seller",
      uploadedAt: dStr(4),
      accessLog: [{ userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(3) }],
      questions: [],
    },
    {
      id: "vd3", folderId: "f-4-1", title: "Key Client Overview — Top 12 Accounts",
      description: "Summary of top 12 clients by revenue. Includes contract duration and renewal dates.",
      type: "pdf", classification: "deal-confidential",
      filename: "Veritas_Client_Overview_Redacted.pdf", fileSize: "1.1 MB",
      version: 1, tags: ["clients", "commercial", "revenue"],
      uploadedBy: USERS.peter, uploadedByName: "Peter de Vries", uploadedByParty: "seller",
      uploadedAt: dStr(3),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(2) },
      ],
      questions: [
        {
          id: "vq3", question: "What is the average contract length and are there any contracts up for renewal in the next 6 months?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(2), status: "open",
        },
      ],
    },
    {
      id: "vd4", folderId: "f-10-1", title: "Teaser Document — Veritas HR Consulting",
      type: "pdf", classification: "deal-confidential",
      filename: "Veritas_Teaser_2024.pdf", fileSize: "680 KB",
      version: 1, tags: ["teaser", "overview"],
      uploadedBy: USERS.peter, uploadedByName: "Peter de Vries", uploadedByParty: "seller",
      uploadedAt: dStr(5),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(5) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view",     at: dStr(4) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(4) },
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "download", at: dStr(3) },
      ],
      questions: [],
    },
  ];

  const vGrants: VDRGrant[] = [
    {
      id: "vg1", userId: USERS.peter, userName: "Peter de Vries", partyType: "seller",
      folderIds: ["f-1", "f-1-1", "f-4", "f-4-1", "f-10", "f-10-1", "f-10-2"],
      canUpload: true, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(5),
    },
    {
      id: "vg2", userId: USERS.michael, userName: "Michael Torres", partyType: "advisor",
      folderIds: [],
      canUpload: false, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(5),
    },
  ];

  const vRequests: VDRDocumentRequest[] = [
    {
      id: "vr1", folderId: "f-2-1", title: "3-year P&L and management accounts (2021–2023)",
      description: "Please provide audited P&L statements for FY2021, FY2022, FY2023 plus most recent management accounts.",
      priority: "high", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(3), dueDate: dsFuture(5), status: "pending",
    },
    {
      id: "vr2", folderId: "f-4-1", title: "Top 3 client contracts (full versions, unredacted)",
      description: "Need complete versions of the top 3 client contracts by revenue for legal review.",
      priority: "normal", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(2), dueDate: dsFuture(7), status: "pending",
    },
  ];

  seedDocuments(veritas_id, vDocs);
  seedGrants(veritas_id, vGrants);
  seedRequests(veritas_id, vRequests);

  // ── 5. Seed VDR: Meridian Care Group (IOI) ─────────────────────────────────

  const mDocs: VDRDocument[] = [
    {
      id: "md1", folderId: "f-9-1", title: "Management Presentation — Meridian Care Group",
      description: "Full management presentation including strategy, operations, financials and team overview.",
      type: "presentation", classification: "restricted",
      filename: "Meridian_Mgmt_Presentation_Oct2024.pptx", fileSize: "8.7 MB",
      version: 2, tags: ["management", "strategy", "operations"],
      uploadedBy: USERS.rob, uploadedByName: "Rob Jansen", uploadedByParty: "seller",
      uploadedAt: dStr(20),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(19) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view",     at: dStr(18) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(17) },
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "download", at: dStr(17) },
      ],
      questions: [
        {
          id: "mq1", question: "What is the management's long-term view on geographic expansion beyond South Holland?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(15), status: "answered",
          answer: "The current focus is consolidating South Holland. We see potential for expansion into Utrecht and Zeeland within 3 years, but this would require additional management capacity.",
          answeredBy: USERS.rob, answeredByName: "Rob Jansen", answeredAt: dStr(13),
        },
        {
          id: "mq2", question: "Can you elaborate on the municipality contract renewal risk for 2025?",
          askedBy: "cl1", askedByName: "Sarah van den Berg", askedByParty: "buyer",
          askedAt: dStr(10), status: "open",
        },
      ],
    },
    {
      id: "md2", folderId: "f-2-1", title: "Historical P&L — FY2021, FY2022, FY2023 (Audited)",
      type: "financial", classification: "restricted",
      filename: "Meridian_Financials_2021-2023.xlsx", fileSize: "2.1 MB",
      version: 1, tags: ["financials", "P&L", "audited"],
      uploadedBy: USERS.sandra, uploadedByName: "Sandra Mulder", uploadedByParty: "seller",
      uploadedAt: dStr(25),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(24) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view",     at: dStr(22) },
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "download", at: dStr(22) },
      ],
      questions: [
        {
          id: "mq3", question: "What drove the 8% EBITDA margin decline in FY2023 (from 21% to 13%)?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(20), status: "answered",
          answer: "FY2023 included a one-time restructuring charge of €180K following the closure of the Leiden office. Normalised EBITDA margin was 19.5%. This is documented in the management accounts Q4 note.",
          answeredBy: USERS.sandra, answeredByName: "Sandra Mulder", answeredAt: dStr(18),
        },
        {
          id: "mq4", question: "Can you provide a bridge from FY2022 to FY2023 EBITDA?",
          askedBy: "dl2", askedByName: "Anna Schmidt", askedByParty: "buyer",
          askedAt: dStr(14), status: "open",
        },
      ],
    },
    {
      id: "md3", folderId: "f-2-2", title: "Management Accounts — Q1–Q3 2024",
      type: "excel", classification: "restricted",
      filename: "Meridian_Mgmt_Accounts_Q3_2024.xlsx", fileSize: "1.4 MB",
      version: 1, tags: ["management accounts", "2024", "quarterly"],
      uploadedBy: USERS.sandra, uploadedByName: "Sandra Mulder", uploadedByParty: "seller",
      uploadedAt: dStr(22),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(21) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view", at: dStr(20) },
      ],
      questions: [],
    },
    {
      id: "md4", folderId: "f-5-1", title: "Organisation Chart — Meridian Care Group",
      type: "pdf", classification: "restricted",
      filename: "Meridian_OrgChart_Nov2024.pdf", fileSize: "540 KB",
      version: 1, tags: ["HR", "org chart", "headcount"],
      uploadedBy: USERS.sandra, uploadedByName: "Sandra Mulder", uploadedByParty: "seller",
      uploadedAt: dStr(18),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(17) },
        { userId: "dl1",        userName: "Elena Rodriguez",   partyType: "buyer", action: "view", at: dStr(15) },
      ],
      questions: [
        {
          id: "mq5", question: "How many FTEs are in management/admin roles vs direct care delivery?",
          askedBy: "dl1", askedByName: "Elena Rodriguez", askedByParty: "buyer",
          askedAt: dStr(12), status: "open",
        },
      ],
    },
    {
      id: "md5", folderId: "f-4-1", title: "Municipal Care Contracts — Key 8 Agreements",
      type: "pdf", classification: "deal-confidential",
      filename: "Meridian_Key_Contracts_Redacted.pdf", fileSize: "3.2 MB",
      version: 1, tags: ["contracts", "municipality", "commercial"],
      uploadedBy: USERS.rob, uploadedByName: "Rob Jansen", uploadedByParty: "seller",
      uploadedAt: dStr(20),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(18) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view", at: dStr(16) },
      ],
      questions: [],
    },
    {
      id: "md6", folderId: "f-10-1", title: "Information Memorandum — Meridian Care Group",
      type: "pdf", classification: "deal-confidential",
      filename: "Meridian_IM_2024.pdf", fileSize: "5.8 MB",
      version: 1, tags: ["IM", "overview", "investor"],
      uploadedBy: USERS.rob, uploadedByName: "Rob Jansen", uploadedByParty: "seller",
      uploadedAt: dStr(30),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(29) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view",     at: dStr(28) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(27) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "download", at: dStr(27) },
      ],
      questions: [],
    },
  ];

  const mGrants: VDRGrant[] = [
    {
      id: "mg1", userId: USERS.sandra, userName: "Sandra Mulder", partyType: "seller",
      folderIds: ["f-2", "f-2-1", "f-2-2", "f-2-3", "f-5", "f-5-1", "f-10", "f-10-1", "f-10-2"],
      canUpload: true, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(28),
    },
    {
      id: "mg2", userId: USERS.rob, userName: "Rob Jansen", partyType: "seller",
      folderIds: ["f-9", "f-9-1", "f-4", "f-4-1", "f-10", "f-10-1"],
      canUpload: false, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(28),
    },
    {
      id: "mg3", userId: USERS.michael, userName: "Michael Torres", partyType: "advisor",
      folderIds: [],
      canUpload: false, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(25),
    },
  ];

  const mRequests: VDRDocumentRequest[] = [
    {
      id: "mr1", folderId: "f-3-1", title: "Tax returns FY2021–FY2023",
      description: "Please provide the full corporate tax returns for the last three financial years.",
      priority: "high", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(15), dueDate: dsFuture(3), status: "pending",
    },
    {
      id: "mr2", folderId: "f-4-2", title: "Full customer data extract — active clients",
      description: "Complete list of active care clients with contract value, care hours and renewal dates.",
      priority: "normal", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(12), dueDate: dsFuture(5), status: "pending",
    },
    {
      id: "mr3", folderId: "f-6-4", title: "IT systems architecture overview",
      description: "Overview of current care management software, integrations and data flows.",
      priority: "low", requestedBy: "dl3", requestedByName: "David Kim",
      requestedAt: dStr(10), dueDate: dsFuture(10), status: "fulfilled",
      fulfilledDocId: "md3", fulfilledAt: dStr(5),
    },
  ];

  seedDocuments(meridian_id, mDocs);
  seedGrants(meridian_id, mGrants);
  seedRequests(meridian_id, mRequests);

  // ── 6. Seed VDR: Crestline Advisory (Due Diligence) ────────────────────────

  const cDocs: VDRDocument[] = [
    {
      id: "cd1", folderId: "f-9-1", title: "Management Presentation — Crestline Advisory Group",
      description: "Comprehensive management presentation. Includes company history, service lines, financials FY2021–2024, team overview and growth strategy.",
      type: "presentation", classification: "restricted",
      filename: "Crestline_Mgmt_Presentation_DD_v3.pptx", fileSize: "11.2 MB",
      version: 3, tags: ["management", "strategy", "DD"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(50),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(48) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view",     at: dStr(47) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(46) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "download", at: dStr(46) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view",     at: dStr(44) },
      ],
      questions: [
        {
          id: "cq1", question: "Slide 24 shows a 15% headcount increase in 2023 — was this organic or related to acquisitions?",
          askedBy: "dl1", askedByName: "Elena Rodriguez", askedByParty: "buyer",
          askedAt: dStr(42), status: "answered",
          answer: "Fully organic. We expanded the restructuring practice in Q2 2023 with 4 senior hires and added 2 analysts to the M&A team. No acquisitions made.",
          answeredBy: USERS.emma, answeredByName: "Emma Hoekstra", answeredAt: dStr(40),
        },
      ],
    },
    {
      id: "cd2", folderId: "f-9-4", title: "Investment Thesis & Value Creation Plan — Crestline",
      description: "Internal buyer document: LBO analysis, value creation levers and 5-year projection.",
      type: "pdf", classification: "highly-restricted",
      filename: "Crestline_InvestmentThesis_v2.pdf", fileSize: "3.8 MB",
      version: 2, tags: ["investment thesis", "LBO", "internal"],
      uploadedBy: USERS.marcus, uploadedByName: "Marcus Wellington", uploadedByParty: "buyer",
      uploadedAt: dStr(45),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(45) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view", at: dStr(43) },
      ],
      questions: [],
    },
    {
      id: "cd3", folderId: "f-1-1", title: "Articles of Association & Chamber of Commerce Extract",
      type: "pdf", classification: "restricted",
      filename: "Crestline_AoA_and_CoC.pdf", fileSize: "1.2 MB",
      version: 1, tags: ["legal", "corporate", "AoA"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(48),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(45) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view", at: dStr(44) },
      ],
      questions: [],
    },
    {
      id: "cd4", folderId: "f-1-3", title: "Shareholder Register & Cap Table — Crestline Advisory",
      type: "pdf", classification: "highly-restricted",
      filename: "Crestline_CapTable_Confidential.pdf", fileSize: "340 KB",
      version: 1, tags: ["shareholders", "cap table", "ownership"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(40),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view",     at: dStr(38) },
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "download", at: dStr(38) },
      ],
      questions: [],
    },
    {
      id: "cd5", folderId: "f-2-1", title: "Audited Financial Statements FY2020–FY2023",
      type: "financial", classification: "restricted",
      filename: "Crestline_AuditedAccounts_2020-2023.xlsx", fileSize: "4.6 MB",
      version: 1, tags: ["financials", "audited", "historical"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(45),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(43) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view",     at: dStr(42) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "download", at: dStr(42) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(40) },
      ],
      questions: [
        {
          id: "cq2", question: "The FY2022 accounts show a €240K exceptional item — can you clarify what this relates to?",
          askedBy: "dl2", askedByName: "Anna Schmidt", askedByParty: "buyer",
          askedAt: dStr(38), status: "answered",
          answer: "This was a settlement of a fee dispute with a former client (now resolved). The matter is fully closed and there are no remaining liabilities. Legal confirmation available in section 8.4.",
          answeredBy: USERS.lars, answeredByName: "Lars Visser", answeredAt: dStr(35),
        },
        {
          id: "cq3", question: "What are the normalised EBITDA figures for each year (before the exceptional items)?",
          askedBy: "dl2", askedByName: "Anna Schmidt", askedByParty: "buyer",
          askedAt: dStr(30), status: "open",
        },
      ],
    },
    {
      id: "cd6", folderId: "f-2-2", title: "Management Accounts — Jan–Oct 2024",
      type: "excel", classification: "restricted",
      filename: "Crestline_Mgmt_Accounts_Oct2024.xlsx", fileSize: "2.1 MB",
      version: 2, tags: ["management accounts", "2024", "YTD"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(20),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(18) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view", at: dStr(17) },
      ],
      questions: [],
    },
    {
      id: "cd7", folderId: "f-2-3", title: "FY2025 Budget & 3-Year Forecast",
      type: "excel", classification: "restricted",
      filename: "Crestline_Budget_Forecast_2025-2027.xlsx", fileSize: "1.8 MB",
      version: 1, tags: ["budget", "forecast", "planning"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(25),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(23) },
        { userId: "dl2",        userName: "Anna Schmidt",       partyType: "buyer", action: "view", at: dStr(22) },
      ],
      questions: [
        {
          id: "cq4", question: "The 2025 budget assumes 12% revenue growth — what are the key assumptions behind this?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(20), status: "open",
        },
      ],
    },
    {
      id: "cd8", folderId: "f-2-5", title: "LBO Financial Model — Crestline Advisory",
      description: "Full LBO model with entry/exit assumptions, debt schedule and returns analysis.",
      type: "excel", classification: "highly-restricted",
      filename: "Crestline_LBO_Model_v4.xlsx", fileSize: "3.2 MB",
      version: 4, tags: ["LBO", "model", "returns", "internal"],
      uploadedBy: USERS.marcus, uploadedByName: "Marcus Wellington", uploadedByParty: "buyer",
      uploadedAt: dStr(30),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(30) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view", at: dStr(28) },
      ],
      questions: [],
    },
    {
      id: "cd9", folderId: "f-3-1", title: "Corporate Tax Returns FY2021–FY2023",
      type: "pdf", classification: "restricted",
      filename: "Crestline_TaxReturns_2021-2023.pdf", fileSize: "2.4 MB",
      version: 1, tags: ["tax", "returns", "fiscal"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(35),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(33) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view", at: dStr(32) },
      ],
      questions: [],
    },
    {
      id: "cd10", folderId: "f-4-1", title: "Key Client Agreements — Top 6 Accounts (Redacted)",
      type: "pdf", classification: "deal-confidential",
      filename: "Crestline_ClientContracts_Top6_Redacted.pdf", fileSize: "6.1 MB",
      version: 1, tags: ["contracts", "clients", "commercial"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(38),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(35) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view", at: dStr(34) },
      ],
      questions: [
        {
          id: "cq5", question: "The two largest clients represent 28% of revenue — what is the likelihood of renewal and are there break clauses?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(30), status: "answered",
          answer: "Both clients have been with us for 7+ years. Contracts run to Q3 2026 with no break clauses. We have had verbal confirmation of intent to renew from both. Formal renewal discussions will start in Q2 2025.",
          answeredBy: USERS.emma, answeredByName: "Emma Hoekstra", answeredAt: dStr(27),
        },
      ],
    },
    {
      id: "cd11", folderId: "f-5-1", title: "Organisation Chart — December 2024",
      type: "pdf", classification: "restricted",
      filename: "Crestline_OrgChart_Dec2024.pdf", fileSize: "420 KB",
      version: 1, tags: ["HR", "org chart", "structure"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(40),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(38) },
        { userId: "dl1",        userName: "Elena Rodriguez",   partyType: "buyer", action: "view", at: dStr(35) },
      ],
      questions: [],
    },
    {
      id: "cd12", folderId: "f-5-2", title: "Key Employment Contracts — Management Team (3)",
      type: "pdf", classification: "highly-restricted",
      filename: "Crestline_KeyContracts_Management.pdf", fileSize: "890 KB",
      version: 1, tags: ["HR", "contracts", "management", "GDPR"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(30),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer", action: "view", at: dStr(28) },
      ],
      questions: [
        {
          id: "cq6", question: "Do the management contracts include change-of-control clauses? If so, what are the implications for the transaction?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(25), status: "open",
        },
      ],
    },
    {
      id: "cd13", folderId: "f-6-1", title: "IT Infrastructure & Systems Overview",
      type: "pdf", classification: "restricted",
      filename: "Crestline_IT_Infrastructure.pdf", fileSize: "1.5 MB",
      version: 1, tags: ["IT", "systems", "infrastructure"],
      uploadedBy: USERS.lars, uploadedByName: "Lars Visser", uploadedByParty: "seller",
      uploadedAt: dStr(28),
      accessLog: [
        { userId: "dl3", userName: "David Kim",           partyType: "buyer", action: "view", at: dStr(25) },
        { userId: "dl3", userName: "David Kim",           partyType: "buyer", action: "download", at: dStr(25) },
      ],
      questions: [],
    },
    {
      id: "cd14", folderId: "f-8-4", title: "Outstanding Legal Proceedings — Client Dispute Disclosure",
      description: "Disclosure of one outstanding client claim (€80K). Status: pre-litigation, settlement discussions ongoing.",
      type: "pdf", classification: "restricted",
      filename: "Crestline_LegalDisclosure_Dec2024.pdf", fileSize: "280 KB",
      version: 2, tags: ["legal", "disputes", "disclosure"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(10),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view", at: dStr(9) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view", at: dStr(8) },
      ],
      questions: [
        {
          id: "cq7", question: "What is the expected timeline for resolving the €80K client dispute and what is the worst-case scenario?",
          askedBy: USERS.marcus, askedByName: "Marcus Wellington", askedByParty: "buyer",
          askedAt: dStr(7), status: "open",
        },
      ],
    },
    {
      id: "cd15", folderId: "f-10-1", title: "Information Memorandum — Crestline Advisory Group",
      type: "pdf", classification: "deal-confidential",
      filename: "Crestline_IM_Confidential.pdf", fileSize: "9.4 MB",
      version: 1, tags: ["IM", "confidential", "overview"],
      uploadedBy: USERS.emma, uploadedByName: "Emma Hoekstra", uploadedByParty: "seller",
      uploadedAt: dStr(65),
      accessLog: [
        { userId: USERS.marcus, userName: "Marcus Wellington", partyType: "buyer",  action: "view",     at: dStr(63) },
        { userId: "cl1",        userName: "Sarah van den Berg", partyType: "buyer", action: "view",     at: dStr(62) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "view",   at: dStr(61) },
        { userId: USERS.michael, userName: "Michael Torres",   partyType: "advisor", action: "download", at: dStr(61) },
      ],
      questions: [],
    },
  ];

  const cGrants: VDRGrant[] = [
    {
      id: "cg1", userId: USERS.emma, userName: "Emma Hoekstra", partyType: "seller",
      folderIds: [],
      canUpload: true, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(55),
    },
    {
      id: "cg2", userId: USERS.lars, userName: "Lars Visser", partyType: "seller",
      folderIds: ["f-2", "f-2-1", "f-2-2", "f-2-3", "f-3", "f-3-1", "f-6", "f-6-1", "f-10", "f-10-1", "f-10-2"],
      canUpload: true, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(55),
    },
    {
      id: "cg3", userId: USERS.michael, userName: "Michael Torres", partyType: "advisor",
      folderIds: [],
      canUpload: false, canAnswer: true,
      grantedBy: USERS.marcus, grantedByName: "Marcus Wellington",
      grantedAt: dStr(52),
    },
  ];

  const cRequests: VDRDocumentRequest[] = [
    {
      id: "cr1", folderId: "f-5-3", title: "Management compensation schedule — all partners",
      description: "Full compensation breakdown for all named partners including bonus structure and equity participation.",
      priority: "high", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(22), dueDate: dsFuture(2), status: "pending",
    },
    {
      id: "cr2", folderId: "f-2-4", title: "Debt overview — any outstanding facilities or loans",
      description: "Full details of any shareholder loans, bank facilities or other debt instruments.",
      priority: "urgent", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(18), dueDate: dsFuture(1), status: "fulfilled",
      fulfilledDocId: "cd6", fulfilledAt: dStr(12),
    },
    {
      id: "cr3", folderId: "f-4-2", title: "Full client list with revenue per client (LTM)",
      description: "Complete client list for last twelve months, revenue per client, contract status and renewal dates.",
      priority: "high", requestedBy: USERS.marcus, requestedByName: "Marcus Wellington",
      requestedAt: dStr(15), dueDate: dsFuture(3), status: "pending",
    },
    {
      id: "cr4", folderId: "f-7-1", title: "Office lease — Amsterdam HQ",
      description: "Full lease agreement for the Amsterdam office including break clauses and rent review terms.",
      priority: "normal", requestedBy: "dl3", requestedByName: "David Kim",
      requestedAt: dStr(10), dueDate: dsFuture(7), status: "declined",
      declinedAt: dStr(7), response: "Lease is subject to a landlord confidentiality clause. We can share a summary. Please confirm if that works.",
    },
    {
      id: "cr5", folderId: "f-1-5", title: "Supplier and partnership agreements (material contracts)",
      description: "Any contracts with material suppliers, technology vendors or strategic partners.",
      priority: "normal", requestedBy: USERS.michael, requestedByName: "Michael Torres",
      requestedAt: dStr(8), dueDate: dsFuture(5), status: "pending",
    },
  ];

  seedDocuments(crestline_id, cDocs);
  seedGrants(crestline_id, cGrants);
  seedRequests(crestline_id, cRequests);

  // ── 7. Mark as loaded ───────────────────────────────────────────────────────
  localStorage.setItem(FULL_DEMO_KEY, "1");
}
