import { Deal, saveDeal, getDeals } from "./store";
import { TargetCompany } from "./crm/types";
import { getTargets } from "./crm/store";
import { generateStageTasks, STAGE_TASKS } from "./crm/stage-tasks";

const CRM_KEY = "crm_targets";
const CRM_DEMO_MARKER = "crm-demo-nexora";

export function isCRMDemoLoaded(): boolean {
  return getTargets().some(t => t.id === CRM_DEMO_MARKER);
}

export function loadCRMDemo(): void {
  if (isCRMDemoLoaded()) return;
  const now = new Date().toISOString();
  const dStr = (daysAgo: number) => { const d = new Date(); d.setDate(d.getDate()-daysAgo); return d.toISOString(); };
  const ds   = (daysAgo: number) => dStr(daysAgo).split("T")[0];

  // Helper: generate tasks with some pre-completed
  function tasks(stage: Parameters<typeof generateStageTasks>[0], completedIds: string[] = []) {
    return generateStageTasks(stage).map((t, i) => ({
      ...t,
      completed: completedIds.includes(t.workstreamId),
      completedAt: completedIds.includes(t.workstreamId) ? dStr(Math.max(1, 5 - i)) : undefined,
    }));
  }

  const targets: TargetCompany[] = [
    {
      id: "crm-demo-nexora", name: "Nexora Facility Services", stage: "qualified",
      sector: "Business Services", country: "NL", city: "Utrecht",
      ebitdaEst: 1200, fte: 95, revenueEst: 8500, founded: 2008,
      geographyFit: "core", strategyFit: "bolt-on", professionalization: 3,
      priority: "high", description: "Facility management company active in the Randstad area.",
      contacts: [], contactLog: [], documents: [],
      crmTasks: tasks("qualified", ["commercial"]),
      stageEnteredAt: { prospect: dStr(30), qualified: dStr(14) },
      createdAt: dStr(30), updatedAt: dStr(14),
    },
    {
      id: "crm-demo-veritas", name: "Veritas HR Consulting", stage: "nda",
      sector: "Business Services", country: "NL", city: "Amsterdam",
      ebitdaEst: 750, fte: 42, revenueEst: 4200,
      geographyFit: "core", strategyFit: "partial", professionalization: 4,
      priority: "high", description: "HR consulting firm, highly complementary to platform HR capabilities.",
      contacts: [{ id: "c1", name: "Peter de Vries", role: "CEO", email: "peter@veritas-hr.nl" }],
      contactLog: [
        { id: "l1", date: ds(10), type: "meeting", summary: "Introductory meeting with Peter de Vries. Positive reception. Agreed to share teaser." },
        { id: "l2", date: ds(5),  type: "email",   summary: "NDA sent. Awaiting signature." },
      ],
      documents: [], crmTasks: tasks("nda", ["finance", "commercial"]),
      stageEnteredAt: { prospect: dStr(45), qualified: dStr(30), contacted: dStr(20), nda: dStr(5) },
      createdAt: dStr(45), updatedAt: dStr(5),
    },
    {
      id: "crm-demo-techbridge", name: "TechBridge Solutions", stage: "contacted",
      sector: "Technology", country: "BE", city: "Ghent",
      ebitdaEst: 550, fte: 28, revenueEst: 3100,
      geographyFit: "adjacent", strategyFit: "bolt-on", professionalization: 4,
      priority: "medium", contacts: [], contactLog: [], documents: [],
      crmTasks: tasks("contacted"),
      stageEnteredAt: { prospect: dStr(20), qualified: dStr(12), contacted: dStr(7) },
      createdAt: dStr(20), updatedAt: dStr(7),
    },
    {
      id: "crm-demo-alpina", name: "Alpina Industrials", stage: "prospect",
      sector: "Industrial", country: "DE", city: "Düsseldorf",
      ebitdaEst: 2100, fte: 180,
      geographyFit: "stretch", strategyFit: "standalone", professionalization: 2,
      priority: "low", contacts: [], contactLog: [], documents: [],
      crmTasks: tasks("prospect"),
      stageEnteredAt: { prospect: dStr(7) },
      createdAt: dStr(7), updatedAt: dStr(7),
    },
    {
      id: "crm-demo-meridian", name: "Meridian Care Group", stage: "ioi",
      sector: "Healthcare", country: "NL", city: "Rotterdam",
      ebitdaEst: 1800, fte: 120, revenueEst: 9200, founded: 2003,
      geographyFit: "core", strategyFit: "full", professionalization: 3,
      priority: "high", description: "Home care provider, strong match with platform healthcare buy-and-build thesis.",
      contacts: [
        { id: "c2", name: "Sandra Mulder", role: "CFO", email: "s.mulder@meridiancare.nl" },
        { id: "c3", name: "Rob Jansen",    role: "CEO" },
      ],
      contactLog: [
        { id: "l3", date: ds(25), type: "meeting", summary: "First management presentation. Strong cultural fit observed." },
        { id: "l4", date: ds(18), type: "call",    summary: "Follow-up on financials. Preliminary P&L shared informally." },
        { id: "l5", date: ds(8),  type: "email",   summary: "IOI submitted at 5.5× EBITDA. Waiting for seller response." },
      ],
      // IOI tasks: finance + commercial done, IT + HR + ops + legal still pending
      documents: [], crmTasks: tasks("ioi", ["finance", "commercial"]),
      stageEnteredAt: { prospect: dStr(60), qualified: dStr(45), contacted: dStr(35), nda: dStr(28), ioi: dStr(8) },
      createdAt: dStr(60), updatedAt: dStr(8),
    },
  ];

  const existing = getTargets();
  const merged = [...existing, ...targets.filter(t => !existing.find(e => e.id === t.id))];
  localStorage.setItem(CRM_KEY, JSON.stringify(merged));
}

export const DEMO_ID = "demo-buildco-quinnect";

export function isDemoLoaded(): boolean {
  return getDeals().some(d => d.id === DEMO_ID);
}

export function loadDemo(): void {
  const closeDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 52);
    return d.toISOString().split("T")[0];
  })();

  const demo: Deal = {
    id: DEMO_ID,
    name: "BuildCo × Quinnect Integration",
    platformCompany: "BuildCo Europe",
    addOnCompany: "Quinnect",
    closeDate,
    overallStrategy: "partial",
    dealBrief: "BuildCo Europe (280 FTE, industrial services, NL + BE) acquires Quinnect (48 FTE, digital marketing agency, Amsterdam) to expand digital capability and drive cross-sell into BuildCo's client base. Key synergies: €320K revenue cross-sell via Quinnect's digital services + €180K shared back-office savings. Integration target: 12 months. IT kept standalone (Quinnect runs Salesforce + custom stack). Finance and HR fully integrated.",
    team: [
      { id: "mw", name: "Marcus Wellington", role: "PE Admin",          initials: "MW", color: "bg-[#242C2D]" },
      { id: "er", name: "Elena Rodriguez",   role: "HR Director",       initials: "ER", color: "bg-[#74A0F4]" },
      { id: "dk", name: "David Kim",         role: "IT Manager",        initials: "DK", color: "bg-[#CDADFC]" },
      { id: "as", name: "Anna Schmidt",      role: "CFO",               initials: "AS", color: "bg-[#9AC183]" },
      { id: "tw", name: "Thomas Weber",      role: "Sales Director",    initials: "TW", color: "bg-[#FF6400]" },
    ],
    workstreamConfigs: [
      { workstreamId: "it", strategy: "standalone", owner: "dk", notes: "Quinnect keeps Salesforce + custom stack for 12 months. Evaluate consolidation at Month 12 review." },
    ],
    tasks: [
      // Day 1 — complete
      { id: "d1t1", itemId: "day1-comms",     workstreamId: "day1",    dealId: DEMO_ID, title: "Prepare employee FAQ document (top 15 questions)",   assigneeId: "er", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Pre-close" },
      { id: "d1t2", itemId: "day1-comms",     workstreamId: "day1",    dealId: DEMO_ID, title: "Joint CEO announcement video to all 328 employees",  assigneeId: "mw", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Day 1" },
      { id: "d1t3", itemId: "day1-comms",     workstreamId: "day1",    dealId: DEMO_ID, title: "Personal calls to top 20 Quinnect customers",        assigneeId: "tw", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Day 1" },
      { id: "d1t4", itemId: "day1-payroll",   workstreamId: "day1",    dealId: DEMO_ID, title: "Map Quinnect payroll cycle to BuildCo schedule",     assigneeId: "as", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Pre-close" },
      { id: "d1t5", itemId: "day1-it-access", workstreamId: "day1",    dealId: DEMO_ID, title: "Set up VPN + email access for Quinnect staff",       assigneeId: "dk", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Day 1" },
      { id: "d1t6", itemId: "day1-retention", workstreamId: "day1",    dealId: DEMO_ID, title: "1:1 retention conversations — top 8 Quinnect staff", assigneeId: "er", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Week 1" },
      { id: "d1t7", itemId: "day1-retention", workstreamId: "day1",    dealId: DEMO_ID, title: "Define retention package for CTO Lena Mayer",        assigneeId: "mw", dueDate: closeDate, completed: true,  createdAt: closeDate, phase: "Week 1" },

      // Finance — 60% done
      { id: "fint1", itemId: "fin-reporting",       workstreamId: "finance", dealId: DEMO_ID, title: "Align monthly close date (Quinnect: 10th → BuildCo: 5th)", assigneeId: "as", dueDate: addDays(closeDate, 14),  completed: true,  createdAt: closeDate, phase: "Phase 1" },
      { id: "fint2", itemId: "fin-reporting",       workstreamId: "finance", dealId: DEMO_ID, title: "Set up consolidated P&L reporting template",              assigneeId: "as", dueDate: addDays(closeDate, 30),  completed: true,  createdAt: closeDate, phase: "Phase 1" },
      { id: "fint3", itemId: "fin-reporting",       workstreamId: "finance", dealId: DEMO_ID, title: "First consolidated month-end report",                     assigneeId: "as", dueDate: addDays(closeDate, 45),  completed: false, createdAt: closeDate, phase: "Phase 2" },
      { id: "fint4", itemId: "fin-synergy-tracking", workstreamId: "finance", dealId: DEMO_ID, title: "Define synergy baseline: revenue cross-sell",            assigneeId: "tw", dueDate: addDays(closeDate, 30),  completed: true,  createdAt: closeDate, phase: "Phase 1" },
      { id: "fint5", itemId: "fin-synergy-tracking", workstreamId: "finance", dealId: DEMO_ID, title: "Define synergy baseline: back-office costs",             assigneeId: "as", dueDate: addDays(closeDate, 30),  completed: false, createdAt: closeDate, phase: "Phase 1" },
      { id: "fint6", itemId: "fin-coa",             workstreamId: "finance", dealId: DEMO_ID, title: "Map Quinnect chart of accounts to BuildCo COA",           assigneeId: "as", dueDate: addDays(closeDate, 60),  completed: false, createdAt: closeDate, phase: "Phase 2" },

      // HR — 35%
      { id: "hrt1", itemId: "hr-org-design",  workstreamId: "hr", dealId: DEMO_ID, title: "Document current org charts of both companies",       assigneeId: "er", dueDate: addDays(closeDate, 14), completed: true,  createdAt: closeDate, phase: "Phase 1" },
      { id: "hrt2", itemId: "hr-org-design",  workstreamId: "hr", dealId: DEMO_ID, title: "Identify overlapping roles (Finance, HR, Admin)",      assigneeId: "er", dueDate: addDays(closeDate, 30), completed: true,  createdAt: closeDate, phase: "Phase 1" },
      { id: "hrt3", itemId: "hr-org-design",  workstreamId: "hr", dealId: DEMO_ID, title: "Design target org structure — present to leadership",   assigneeId: "er", dueDate: addDays(closeDate, 50), completed: false, createdAt: closeDate, phase: "Phase 2" },
      { id: "hrt4", itemId: "hr-comp",        workstreamId: "hr", dealId: DEMO_ID, title: "Compensation benchmark vs. market",                    assigneeId: "er", dueDate: addDays(closeDate, 60), completed: false, createdAt: closeDate, phase: "Phase 2" },
      { id: "hrt5", itemId: "hr-works-council", workstreamId: "hr", dealId: DEMO_ID, title: "Works council notification — change of control",     assigneeId: "er", dueDate: addDays(closeDate, 7),  completed: true,  createdAt: closeDate, phase: "Phase 1" },

      // Commercial — just starting
      { id: "comt1", itemId: "com-customer-comms", workstreamId: "commercial", dealId: DEMO_ID, title: "Identify top 20 cross-sell prospects in BuildCo base", assigneeId: "tw", dueDate: addDays(closeDate, 45), completed: false, createdAt: closeDate, phase: "Phase 1" },
      { id: "comt2", itemId: "com-cross-sell",     workstreamId: "commercial", dealId: DEMO_ID, title: "Build combined value proposition deck",                assigneeId: "tw", dueDate: addDays(closeDate, 60), completed: false, createdAt: closeDate, phase: "Phase 2" },

      // Culture — not started
    ],
    actionPlans: {
      "day1-comms": `**PHASE 1 — Pre-close (Week −2 to Day 1)**
- [ ] Finalise communication cascade: CEO → managers → employees (within 2 hours of announcement)
- [ ] Prepare Q&A covering top 15 employee questions
- [ ] Brief BuildCo management team on Quinnect deal rationale and what it means for them

**PHASE 2 — Day 1 Execution**
- [ ] Joint CEO video message to all 328 employees at 9:00
- [ ] Line managers hold team briefings by 12:00
- [ ] Account managers call top 20 Quinnect customers personally
- [ ] Send written follow-up to all employees by 17:00

**Key Decisions Required**
- Brand: will Quinnect retain its brand? → CEO + CMO by Day −7
- Communication channels for Quinnect staff (email vs Teams)

**Success Metrics**
- All employees briefed within 4 hours of announcement
- No media leaks before planned communication
- Customer satisfaction score maintained at ≥ pre-deal baseline`,

      "fin-reporting": `**PHASE 1 — Month 1 (Days 1–30)**
- [ ] Align monthly close date: Quinnect shifts from 10th to BuildCo's 5th
- [ ] Map accounting policies: Quinnect uses Dutch GAAP, BuildCo uses IFRS — identify gaps
- [ ] Set up consolidated P&L template in BuildCo's reporting system

**PHASE 2 — Month 2 (Days 31–60)**
- [ ] First consolidated month-end close — expect manual adjustments
- [ ] Set up weekly flash P&L for Quinnect during transition
- [ ] Define minimum KPI set for PE reporting pack

**Key Decisions Required**
- Which system owns consolidated reporting? (BuildCo ERP vs standalone Excel first)
- IFRS vs Dutch GAAP: apply for year-end or immediately?

**Success Metrics**
- Consolidated financials available by Day 35
- No more than 3 manual adjustments in first close`,
    },
    createdAt: new Date(closeDate).toISOString(),
  };

  saveDeal(demo);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
