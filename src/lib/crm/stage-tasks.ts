import { CRMStage, CRMTask } from "./types";

// ── Department meta (mirrors PMI_LIBRARY workstreams) ─────────────────────────

export const CRM_DEPTS: Record<string, { name: string; icon: string }> = {
  finance:    { name: "Finance & Controlling", icon: "💰" },
  commercial: { name: "Commercial",            icon: "📈" },
  it:         { name: "IT & Systems",          icon: "💻" },
  hr:         { name: "HR & People",           icon: "👥" },
  operations: { name: "Operations",            icon: "⚙️" },
  legal:      { name: "Legal & Compliance",    icon: "⚖️" },
};

// ── Task templates per stage ──────────────────────────────────────────────────

interface TaskTemplate {
  workstreamId: string;
  title: string;
  description: string;
}

export const STAGE_TASKS: Partial<Record<CRMStage, TaskTemplate[]>> = {

  prospect: [
    {
      workstreamId: "commercial",
      title: "Screen strategic fit with buy-and-build thesis",
      description: "Assess whether the target's market position, customer base, and service offering align with the platform's strategic direction. Document fit rationale.",
    },
    {
      workstreamId: "finance",
      title: "Estimate financial profile from public or market data",
      description: "Use available sources (trade register, sector benchmarks, LinkedIn) to estimate revenue range, EBITDA margin, and growth rate. Identify data gaps.",
    },
    {
      workstreamId: "operations",
      title: "Assess high-level operational model compatibility",
      description: "Review publicly available information on service delivery model, geographic presence, and operational structure. Flag any obvious incompatibilities.",
    },
  ],

  qualified: [
    {
      workstreamId: "commercial",
      title: "Map competitive landscape and differentiation",
      description: "Identify the target's main competitors, market share estimate, and key differentiators. Assess whether the position is defensible post-acquisition.",
    },
    {
      workstreamId: "finance",
      title: "Define preliminary valuation range",
      description: "Based on sector comparable multiples (EV/EBITDA), set a preliminary valuation range and maximum price the fund would consider. Include synergy upside scenario.",
    },
    {
      workstreamId: "hr",
      title: "Identify key person dependencies and management quality",
      description: "Research management team via LinkedIn, website, and network. Flag any single-owner dependency or gaps in the leadership team that could impact value.",
    },
    {
      workstreamId: "legal",
      title: "Screen for known regulatory or legal constraints",
      description: "Check for sector-specific licensing requirements, known litigation, or regulatory restrictions that could complicate or block the transaction.",
    },
  ],

  contacted: [
    {
      workstreamId: "commercial",
      title: "Prepare tailored outreach materials (teaser / IM)",
      description: "Draft a concise value proposition and outreach approach. Prepare a one-page teaser if needed. Define the narrative for initial conversations.",
    },
    {
      workstreamId: "legal",
      title: "Draft or review mutual NDA",
      description: "Prepare the NDA to be signed before sharing any confidential information. Confirm scope, exclusivity clause, and confidentiality period.",
    },
    {
      workstreamId: "finance",
      title: "Define minimum financial information to request post-NDA",
      description: "Agree on the priority financial data points to request as soon as the NDA is signed: P&L (3 years), EBITDA breakdown, balance sheet, backlog.",
    },
  ],

  nda: [
    {
      workstreamId: "finance",
      title: "Review P&L and assess quality of earnings",
      description: "Analyse the preliminary financial statements. Identify normalisation adjustments, one-off items, owner salary, and working capital patterns. Form a view on sustainable EBITDA.",
    },
    {
      workstreamId: "commercial",
      title: "Quantify revenue synergy potential",
      description: "Model cross-sell and upsell opportunities between the target and existing portfolio. Estimate revenue synergy size, timing, and probability. Validate with commercial team.",
    },
    {
      workstreamId: "it",
      title: "Initial IT stack assessment and integration complexity",
      description: "Obtain overview of core systems (ERP, CRM, billing, infrastructure). Assess compatibility with platform stack and estimate integration complexity: low / medium / high.",
    },
    {
      workstreamId: "hr",
      title: "Assess headcount profile and retention risk",
      description: "Review FTE count, contract types, and management team. Identify retention risk for key employees. Flag any pending restructuring or labour disputes.",
    },
    {
      workstreamId: "operations",
      title: "Evaluate operational structure and integration effort",
      description: "Map core operational processes, outsourcing arrangements, and supplier dependencies. Estimate operational integration effort and identify quick wins.",
    },
    {
      workstreamId: "legal",
      title: "Screen for legal risks and regulatory exposure",
      description: "Review available information on contracts, licenses, pending litigation, IP ownership, and compliance status. Identify red flags that could affect valuation or deal structure.",
    },
  ],

  ioi: [
    {
      workstreamId: "finance",
      title: "Build valuation model and define IOI price range",
      description: "Build a full LBO or DCF model based on preliminary financials. Define the IOI price range including base case and synergy scenario. Agree on deal structure (equity / earn-out).",
    },
    {
      workstreamId: "commercial",
      title: "Validate commercial synergy assumptions for the IOI",
      description: "Challenge and sign off on the synergy case. Confirm revenue synergy timeline and cost to achieve. Validate that assumptions are realistic based on comparable deals.",
    },
    {
      workstreamId: "it",
      title: "Full IT integration complexity and cost estimate",
      description: "Produce a detailed IT integration assessment: systems to consolidate, migration timelines, costs, and risks. Assess whether full IT integration is feasible or if standalone is preferred.",
    },
    {
      workstreamId: "hr",
      title: "Org design proposal and retention strategy",
      description: "Draft an outline org design for the combined entity. Identify key retention requirements and estimate retention bonus costs. Assess cultural fit at management level.",
    },
    {
      workstreamId: "operations",
      title: "Integration blueprint for operations",
      description: "Outline the target operating model post-integration. Identify shared services opportunities, facility consolidation potential, and phasing of operational changes.",
    },
    {
      workstreamId: "legal",
      title: "Identify key legal conditions and LOI deal terms",
      description: "Define the key conditions precedent and protective clauses to include in the LOI: exclusivity period, MAC clause, reps & warranties scope, and any carve-outs.",
    },
  ],

  loi: [
    {
      workstreamId: "finance",
      title: "Submit financial due diligence information request",
      description: "Prepare and submit the financial DD information request list: audited accounts, management accounts, tax returns, working capital analysis, debt schedule, and capex history.",
    },
    {
      workstreamId: "commercial",
      title: "Submit commercial due diligence information request",
      description: "Prepare the commercial DD request: customer contracts, pipeline data, churn rates, pricing agreements, key account details, and competitive intelligence.",
    },
    {
      workstreamId: "it",
      title: "Submit technical/IT due diligence information request",
      description: "Prepare the technical DD request: system architecture docs, software licences, IT contracts, security policies, infrastructure inventory, and pending tech debt.",
    },
    {
      workstreamId: "hr",
      title: "Submit HR and people due diligence information request",
      description: "Prepare the HR DD request: employee register, contract templates, collective agreements, benefits schemes, pension obligations, and any ongoing HR disputes.",
    },
    {
      workstreamId: "legal",
      title: "Submit legal due diligence information request",
      description: "Prepare the legal DD request: corporate documents, material contracts, IP register, real estate leases, insurance policies, litigation overview, and regulatory licences.",
    },
    {
      workstreamId: "operations",
      title: "Submit operational due diligence information request",
      description: "Prepare the operational DD request: process documentation, supplier contracts, quality certifications, facility leases, and capacity/utilisation data.",
    },
  ],

  "due-diligence": [
    {
      workstreamId: "finance",
      title: "Sign off on financial DD findings",
      description: "Review all financial DD findings, normalised EBITDA, working capital peg, and net debt position. Confirm final price or request adjustment. Sign off for deal committee.",
    },
    {
      workstreamId: "commercial",
      title: "Sign off on commercial DD findings",
      description: "Review commercial DD output. Confirm or revise synergy case based on DD findings. Sign off on customer concentration, churn, and pipeline quality assessment.",
    },
    {
      workstreamId: "it",
      title: "Sign off on technical DD findings",
      description: "Review technical DD report. Confirm IT integration approach, costs, and timeline. Flag any showstopper risks (e.g., unmitigable security issues, unsupported systems).",
    },
    {
      workstreamId: "hr",
      title: "Sign off on HR DD findings",
      description: "Review HR DD output. Confirm headcount, liabilities (pension, redundancy), and retention plan. Flag any material people risk for the deal committee.",
    },
    {
      workstreamId: "legal",
      title: "Sign off on legal DD findings",
      description: "Review legal DD report. Confirm all risks are either mitigated via indemnities/warranties or accepted. Approve SPA signing from a legal risk perspective.",
    },
    {
      workstreamId: "operations",
      title: "Sign off on operational DD findings",
      description: "Review operational DD output. Confirm integration assumptions remain valid. Flag material operational risks and agree on Day 1 readiness requirements.",
    },
  ],
};

// ── Custom template management ────────────────────────────────────────────────

const TEMPLATE_KEY = "crm_task_templates";

type TemplateStore = Partial<Record<CRMStage, TaskTemplate[]>>;

function getTemplateStore(): TemplateStore {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) ?? "{}"); } catch { return {}; }
}

/** Save tasks from a target's checklist as the platform default for that stage */
export function saveCustomTemplate(stage: CRMStage, tasks: { workstreamId: string; title: string; description: string }[]): void {
  const store = getTemplateStore();
  store[stage] = tasks;
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("crm-templates-update"));
}

/** Reset a stage back to built-in defaults */
export function resetCustomTemplate(stage: CRMStage): void {
  const store = getTemplateStore();
  delete store[stage];
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("crm-templates-update"));
}

/** Which stages have custom templates */
export function customTemplateStages(): CRMStage[] {
  return Object.keys(getTemplateStore()) as CRMStage[];
}

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateStageTasks(stage: CRMStage): CRMTask[] {
  const store = getTemplateStore();
  const templates = store[stage] ?? STAGE_TASKS[stage] ?? [];
  return templates.map(t => ({
    id: crypto.randomUUID(),
    stage,
    workstreamId: t.workstreamId,
    title: t.title,
    description: t.description,
    completed: false,
  }));
}
