export type IntegrationStrategy = "full" | "partial" | "bolt-on" | "standalone";

export interface IntegrationItem {
  id: string;
  title: string;
  description: string;
  typicalTimeline: string;
  dependencies: string[];
  riskFlags: string[];
  strategies: IntegrationStrategy[]; // which strategies activate this item
  bestPractices: string[];
  synergyLink?: string;
  owner: string; // suggested role
}

export interface Workstream {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  items: IntegrationItem[];
}

export const PMI_LIBRARY: Workstream[] = [
  {
    id: "day1",
    name: "Day 1 Readiness",
    icon: "🚀",
    color: "bg-red-500",
    description: "Critical actions required before or on closing day to ensure business continuity.",
    items: [
      {
        id: "day1-comms",
        title: "Communication Plan",
        description: "Define and execute internal and external communication on Day 1 — employees, customers, suppliers, press.",
        typicalTimeline: "Pre-close → Day 1",
        dependencies: [],
        riskFlags: [
          "Leaks before planned announcement destroy trust",
          "Inconsistent messaging across channels causes confusion",
          "Key customer communication delays risk churn"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Prepare employee FAQ document before Day 1",
          "CEO of platform and add-on should communicate jointly",
          "Segment messages: employees first, then customers, then market",
          "Assign communication owners per stakeholder group",
          "Prepare Q&A for managers to handle employee questions"
        ],
        owner: "CEO / HR Director"
      },
      {
        id: "day1-payroll",
        title: "Payroll Continuity",
        description: "Ensure uninterrupted payroll processing for all add-on employees from Day 1.",
        typicalTimeline: "Pre-close",
        dependencies: [],
        riskFlags: [
          "Missed payroll is the fastest way to lose employee trust",
          "Different payroll cycles (weekly vs monthly) need alignment"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Map current payroll provider and cycle of add-on",
          "Decide: keep existing payroll provider short-term or migrate immediately",
          "Identify payroll contacts at both companies",
          "Test payroll run before close if possible"
        ],
        owner: "CFO / HR Director"
      },
      {
        id: "day1-it-access",
        title: "IT Access & Email",
        description: "Ensure employees have all required system access and communication tools from Day 1.",
        typicalTimeline: "Pre-close → Week 1",
        dependencies: [],
        riskFlags: [
          "Access delays kill productivity in first critical weeks",
          "Security gaps if old credentials not revoked"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Create IT access checklist per employee role",
          "Decide on email domain strategy (keep, migrate, dual-run)",
          "Ensure VPN and remote access is configured",
          "Revoke departing employee access on Day 1"
        ],
        owner: "IT Manager"
      },
      {
        id: "day1-retention",
        title: "Key People Retention",
        description: "Identify and secure commitment of top talent and critical knowledge holders.",
        typicalTimeline: "Pre-close → 30 days",
        dependencies: [],
        riskFlags: [
          "Key people leaving in first 90 days is the most common integration failure",
          "Retention packages that arrive too late lose impact"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Map top 10% critical employees before close",
          "Hold 1:1 retention conversations before Day 1 announcement",
          "Consider retention bonuses tied to 12-24 month milestones",
          "Clarify career paths and growth opportunities in new structure",
          "Assign an integration buddy from the platform to each key hire"
        ],
        owner: "CEO / HR Director"
      },
      {
        id: "day1-legal-entity",
        title: "Legal Entity Setup",
        description: "Complete all legal formalities for transfer of ownership and operational continuity.",
        typicalTimeline: "Pre-close",
        dependencies: [],
        riskFlags: [
          "Incomplete legal transfers can halt operations",
          "License and permit transfers are often overlooked"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Transfer all licenses, permits and registrations",
          "Update bank mandates and authorized signatories",
          "Notify regulators where required",
          "Transfer insurance policies to new entity"
        ],
        owner: "CFO / Legal Counsel"
      }
    ]
  },
  {
    id: "hr",
    name: "HR & People",
    icon: "👥",
    color: "bg-blue-500",
    description: "Organization design, role alignment, compensation, and culture integration.",
    items: [
      {
        id: "hr-org-design",
        title: "Organisation Design",
        description: "Define the target org structure combining platform and add-on, including reporting lines and spans of control.",
        typicalTimeline: "0–60 days",
        dependencies: ["day1-retention"],
        riskFlags: [
          "Unclear reporting lines create power vacuums",
          "Too many layers added from merger reduce agility",
          "Announcing org design too late increases anxiety"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Start with leadership layer, cascade down",
          "Benchmark span of control (7–10 direct reports ideal)",
          "Identify duplicate roles early and handle with care",
          "Publish org chart within 60 days of close",
          "Involve line managers in design, not just HR"
        ],
        synergyLink: "Headcount synergies",
        owner: "CEO / HR Director"
      },
      {
        id: "hr-role-mapping",
        title: "Role Mapping & Redundancy",
        description: "Map roles across both companies, identify overlaps, and manage any workforce reduction with care.",
        typicalTimeline: "30–90 days",
        dependencies: ["hr-org-design"],
        riskFlags: [
          "Poorly handled redundancies damage culture and employer brand",
          "Legal risks if consultation process not followed",
          "Losing institutional knowledge with role eliminations"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Document all roles and responsibilities before mapping",
          "Follow local labor law on consultation periods",
          "Offer voluntary redundancy before compulsory where possible",
          "Retain knowledge through handover documentation",
          "Provide outplacement support to strengthen employer brand"
        ],
        synergyLink: "Headcount synergies",
        owner: "HR Director"
      },
      {
        id: "hr-comp",
        title: "Compensation Harmonisation",
        description: "Align salary bands, bonus structures, and benefits across platform and add-on.",
        typicalTimeline: "60–180 days",
        dependencies: ["hr-org-design"],
        riskFlags: [
          "Visible pay inequity between merged teams kills morale",
          "Harmonising up is costly, harmonising down triggers attrition"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Conduct full compensation benchmark against market",
          "Define target pay philosophy (e.g. median of market)",
          "Phase harmonisation over 1–2 performance cycles",
          "Communicate the roadmap, even if changes take time",
          "Review benefit packages and align to best-of-both where possible"
        ],
        owner: "CFO / HR Director"
      },
      {
        id: "hr-works-council",
        title: "Works Council & Union Consultation",
        description: "Manage any legally required consultation with employee representative bodies.",
        typicalTimeline: "Pre-close → 90 days",
        dependencies: [],
        riskFlags: [
          "Failure to consult in time can invalidate decisions",
          "Hostile works council can delay integration by months"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Map all works council and union obligations before close",
          "Engage works council early with transparency",
          "Prepare clear business rationale documents",
          "Assign dedicated HR partner to works council relationship"
        ],
        owner: "HR Director / Legal"
      }
    ]
  },
  {
    id: "finance",
    name: "Finance & Controlling",
    icon: "💰",
    color: "bg-green-500",
    description: "Financial reporting, systems alignment, treasury, and synergy tracking.",
    items: [
      {
        id: "fin-reporting",
        title: "Financial Reporting Alignment",
        description: "Align reporting cycles, formats, and KPIs so consolidated financials are available from Month 1.",
        typicalTimeline: "0–30 days",
        dependencies: [],
        riskFlags: [
          "Delayed consolidated reporting blinds PE fund to performance",
          "Different reporting periods cause consolidation errors"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Align reporting calendar immediately (monthly close date)",
          "Define minimum required KPI set for PE reporting pack",
          "Map differences in accounting policies (IFRS vs local GAAP)",
          "Assign a finance integration lead from platform to add-on",
          "Set up weekly flash reporting in first 90 days"
        ],
        owner: "CFO"
      },
      {
        id: "fin-coa",
        title: "Chart of Accounts Harmonisation",
        description: "Standardise the chart of accounts across platform and add-on for clean consolidated reporting.",
        typicalTimeline: "30–90 days",
        dependencies: ["fin-reporting"],
        riskFlags: [
          "Mismatched accounts produce unreliable P&L comparisons",
          "COA migration often underestimated in complexity"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Map add-on COA to platform COA before migration",
          "Identify non-mappable accounts and handle manually short-term",
          "Involve external auditor in significant COA changes",
          "Test consolidated reporting with mapped COA before go-live"
        ],
        synergyLink: "Reporting efficiency",
        owner: "CFO / Financial Controller"
      },
      {
        id: "fin-synergy-tracking",
        title: "Synergy Tracking Framework",
        description: "Set up a structured framework to track planned synergies against actual realisation.",
        typicalTimeline: "0–30 days",
        dependencies: ["fin-reporting"],
        riskFlags: [
          "Synergies not tracked = synergies not realised",
          "Synergy estimates from DD are often optimistic"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Map all synergy cases from due diligence to an owner and timeline",
          "Define baseline metrics before integration starts",
          "Report synergy progress monthly alongside financial results",
          "Separate one-time integration costs from recurring synergy savings",
          "Build conservative, base, and stretch synergy scenarios"
        ],
        synergyLink: "All synergy categories",
        owner: "CFO / PE Fund"
      },
      {
        id: "fin-treasury",
        title: "Treasury & Cash Management",
        description: "Integrate cash management, banking relationships, and intercompany flows.",
        typicalTimeline: "0–60 days",
        dependencies: ["day1-legal-entity"],
        riskFlags: [
          "Dual banking relationships create unnecessary cost",
          "Intercompany transactions must be properly documented"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Consolidate banking relationships where possible",
          "Set up cash pooling structure if group size warrants it",
          "Define intercompany pricing policy",
          "Review and renegotiate credit facilities as combined entity"
        ],
        owner: "CFO"
      }
    ]
  },
  {
    id: "it",
    name: "IT & Systems",
    icon: "💻",
    color: "bg-purple-500",
    description: "Infrastructure, applications, cybersecurity, and data integration.",
    items: [
      {
        id: "it-assessment",
        title: "IT Landscape Assessment",
        description: "Map all systems, infrastructure, and IT costs of the add-on to define integration architecture.",
        typicalTimeline: "0–30 days",
        dependencies: [],
        riskFlags: [
          "Hidden legacy systems discovered post-close derail timelines",
          "Cybersecurity vulnerabilities in add-on become platform risk"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Conduct full IT asset inventory in first 2 weeks",
          "Assess cybersecurity posture (pen test if warranted)",
          "Map all SaaS subscriptions and licenses",
          "Identify shadow IT (unsanctioned tools teams use)",
          "Define IT integration approach: lift & shift, replace, or coexist"
        ],
        owner: "IT Manager / CTO"
      },
      {
        id: "it-erp",
        title: "ERP / Core Systems Decision",
        description: "Decide on the long-term ERP and core system strategy — consolidate, migrate, or run parallel.",
        typicalTimeline: "30–180 days",
        dependencies: ["it-assessment", "fin-coa"],
        riskFlags: [
          "ERP migrations are the highest-risk integration workstream",
          "Running dual ERPs long-term is expensive and error-prone",
          "Do not rush ERP migration — bad data migration is catastrophic"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Never migrate ERP in first 90 days unless unavoidable",
          "Define data migration scope and cleansing requirements",
          "Run parallel systems during cutover period (minimum 1 month)",
          "Involve key users in UAT before go-live",
          "Build rollback plan before go-live"
        ],
        synergyLink: "IT cost synergies",
        owner: "CTO / CFO"
      },
      {
        id: "it-cyber",
        title: "Cybersecurity Integration",
        description: "Extend platform security standards to the add-on and remediate any vulnerabilities.",
        typicalTimeline: "0–90 days",
        dependencies: ["it-assessment"],
        riskFlags: [
          "Add-on with poor security posture is a liability on Day 1",
          "Integration increases attack surface area"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Apply platform security policies to add-on from Day 1",
          "Enable MFA for all employees immediately",
          "Review and update firewall rules and access controls",
          "Conduct phishing awareness training for add-on staff",
          "Set up unified security monitoring (SIEM)"
        ],
        owner: "IT Manager / CTO"
      }
    ]
  },
  {
    id: "commercial",
    name: "Commercial",
    icon: "📈",
    color: "bg-orange-500",
    description: "Sales, marketing, customer retention, and revenue synergy realisation.",
    items: [
      {
        id: "com-customer-comms",
        title: "Customer Communication",
        description: "Communicate the acquisition to customers in a way that builds confidence and prevents churn.",
        typicalTimeline: "Day 1 → 30 days",
        dependencies: ["day1-comms"],
        riskFlags: [
          "Customers fear service disruption or price increases post-acquisition",
          "Competitor sales teams will target your customers during the uncertainty window"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Account managers reach out personally to top 20% of customers",
          "Message focuses on continuity and strengthened capability",
          "Avoid promising product changes you cannot deliver",
          "Set up customer satisfaction pulse survey at 30, 60, 90 days",
          "Brief sales team on how to handle customer acquisition questions"
        ],
        owner: "CCO / Sales Director"
      },
      {
        id: "com-cross-sell",
        title: "Cross-sell Opportunity Mapping",
        description: "Identify and prioritise cross-sell opportunities between platform and add-on customer bases.",
        typicalTimeline: "30–90 days",
        dependencies: ["com-customer-comms"],
        riskFlags: [
          "Cross-selling too aggressively too early damages trust",
          "Sales teams need training before they can sell the combined proposition"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Map customer segments of both companies to find overlap and gaps",
          "Identify top 10 cross-sell opportunities with revenue potential",
          "Create combined value proposition messaging per segment",
          "Run joint sales calls with representatives from both teams",
          "Track cross-sell pipeline separately to measure synergy realisation"
        ],
        synergyLink: "Revenue synergies",
        owner: "CCO / Sales Director"
      },
      {
        id: "com-brand",
        title: "Brand Strategy",
        description: "Define the brand architecture — whether the add-on keeps its brand, adopts the platform brand, or merges.",
        typicalTimeline: "30–90 days",
        dependencies: [],
        riskFlags: [
          "Killing a strong local brand destroys goodwill overnight",
          "Running dual brands long-term is confusing and costly"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Assess brand equity of add-on before deciding",
          "Consider a co-branding transition period (12–24 months)",
          "Align brand decision with overall integration strategy",
          "Communicate brand transition timeline clearly to customers"
        ],
        owner: "CMO / CEO"
      }
    ]
  },
  {
    id: "operations",
    name: "Operations",
    icon: "⚙️",
    color: "bg-yellow-500",
    description: "Process alignment, supply chain, procurement, and shared services.",
    items: [
      {
        id: "ops-process-mapping",
        title: "Process Mapping",
        description: "Document and compare core operational processes of both companies to identify best practices and gaps.",
        typicalTimeline: "30–90 days",
        dependencies: [],
        riskFlags: [
          "Forcing platform processes onto add-on without assessment destroys what worked",
          "Process mapping without action plan wastes effort"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Map top 10 core processes in both companies (as-is)",
          "Identify which version of each process is best practice",
          "Define the to-be process and migration plan",
          "Involve frontline employees who actually run the processes",
          "Prioritise processes with highest synergy or risk impact"
        ],
        owner: "COO"
      },
      {
        id: "ops-procurement",
        title: "Procurement Consolidation",
        description: "Consolidate supplier relationships and leverage combined buying power for cost savings.",
        typicalTimeline: "60–180 days",
        dependencies: ["ops-process-mapping"],
        riskFlags: [
          "Supplier lock-in contracts limit ability to consolidate",
          "Moving too fast on supplier changes disrupts supply"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Map all supplier contracts of both companies with value and expiry",
          "Identify overlap and renegotiation opportunities",
          "Prioritise top 10 spend categories for consolidation",
          "Negotiate combined volumes before contract renewal dates",
          "Create preferred supplier list for the combined entity"
        ],
        synergyLink: "Procurement cost synergies",
        owner: "COO / CFO"
      },
      {
        id: "ops-shared-services",
        title: "Shared Services Identification",
        description: "Identify functions that can be centralised across the combined entity for efficiency.",
        typicalTimeline: "60–180 days",
        dependencies: ["ops-process-mapping"],
        riskFlags: [
          "Shared services require critical mass to deliver savings",
          "Local resistance to centralisation is common"
        ],
        strategies: ["full", "partial"],
        bestPractices: [
          "Assess HR, Finance, IT, and Legal for shared service potential",
          "Build business case with FTE and cost savings projected",
          "Pilot with one function before rolling out broadly",
          "Ensure service levels are defined and monitored"
        ],
        synergyLink: "Overhead cost synergies",
        owner: "COO / CFO"
      }
    ]
  },
  {
    id: "legal",
    name: "Legal & Compliance",
    icon: "⚖️",
    color: "bg-slate-500",
    description: "Contract novation, IP transfer, regulatory compliance, and risk management.",
    items: [
      {
        id: "legal-contracts",
        title: "Contract Novation",
        description: "Transfer or renegotiate all material contracts from the add-on legal entity to the new ownership structure.",
        typicalTimeline: "0–90 days",
        dependencies: ["day1-legal-entity"],
        riskFlags: [
          "Change of control clauses can trigger contract termination rights",
          "Customer and supplier contracts often have notification requirements"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Review all material contracts for change of control provisions",
          "Prioritise customer contracts, then key supplier contracts",
          "Send novation notices within required timeframes",
          "Track contract status in a centralised contract register"
        ],
        owner: "Legal Counsel / CFO"
      },
      {
        id: "legal-ip",
        title: "IP & Asset Transfer",
        description: "Formally transfer intellectual property, trademarks, patents, and key assets to the new ownership structure.",
        typicalTimeline: "0–60 days",
        dependencies: ["day1-legal-entity"],
        riskFlags: [
          "IP not formally transferred remains with old entity",
          "Trademark registrations in wrong entity create licensing complexity"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Conduct full IP inventory (trademarks, patents, software, domain names)",
          "File transfer documents with relevant IP offices",
          "Update license agreements for any licensed IP",
          "Assess IP value for balance sheet treatment"
        ],
        owner: "Legal Counsel"
      },
      {
        id: "legal-compliance",
        title: "Compliance Harmonisation",
        description: "Extend platform compliance standards (GDPR, sector regulations, policies) to the add-on.",
        typicalTimeline: "0–90 days",
        dependencies: [],
        riskFlags: [
          "Add-on non-compliance becomes platform liability from Day 1",
          "GDPR breaches in particular carry significant fines"
        ],
        strategies: ["full", "partial", "bolt-on", "standalone"],
        bestPractices: [
          "Conduct compliance gap assessment in first 30 days",
          "Apply platform data privacy and GDPR policies immediately",
          "Roll out compliance training to add-on employees",
          "Review sector-specific licensing and regulatory requirements"
        ],
        owner: "Legal Counsel / Compliance Officer"
      }
    ]
  },
  {
    id: "culture",
    name: "Culture & Change",
    icon: "🌱",
    color: "bg-teal-500",
    description: "Cultural integration, leadership alignment, change management, and employee engagement.",
    items: [
      {
        id: "culture-assessment",
        title: "Cultural Assessment",
        description: "Understand the cultural profile of both companies and define the target culture for the combined entity.",
        typicalTimeline: "0–60 days",
        dependencies: [],
        riskFlags: [
          "Culture clash is the most cited reason for integration failure",
          "Assuming cultural similarity without assessing is a common mistake"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Run a structured cultural survey in both companies within 30 days",
          "Conduct focus groups with mixed teams from both companies",
          "Identify cultural strengths to preserve in each company",
          "Define 3–5 cultural values for the combined entity",
          "Involve leadership of both companies in culture definition"
        ],
        owner: "CEO / HR Director"
      },
      {
        id: "culture-change-mgmt",
        title: "Change Management Programme",
        description: "Structure and run a formal change management programme to bring employees through the integration journey.",
        typicalTimeline: "0–180 days",
        dependencies: ["culture-assessment", "day1-comms"],
        riskFlags: [
          "Employees left in the dark disengage and leave",
          "Change fatigue sets in without milestones and celebration"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Appoint integration ambassadors in both companies",
          "Run regular all-hands updates (monthly minimum)",
          "Create feedback channels for employees to raise concerns",
          "Celebrate integration milestones visibly",
          "Measure employee sentiment every 60 days"
        ],
        owner: "CEO / HR Director"
      },
      {
        id: "culture-leadership",
        title: "Leadership Alignment",
        description: "Align the combined leadership team around strategy, culture, and ways of working.",
        typicalTimeline: "0–30 days",
        dependencies: ["hr-org-design"],
        riskFlags: [
          "Leadership team misalignment is visible to the whole organisation",
          "Competing agendas between platform and add-on leaders undermine integration"
        ],
        strategies: ["full", "partial", "bolt-on"],
        bestPractices: [
          "Run a leadership alignment workshop within first 30 days",
          "Define shared goals and accountability for integration success",
          "Establish a combined leadership meeting cadence",
          "Address any legacy tensions between leadership teams proactively",
          "Align on communication style: what to say, what not to say"
        ],
        owner: "CEO"
      }
    ]
  }
];

export const INTEGRATION_STRATEGIES = [
  {
    value: "full" as IntegrationStrategy,
    label: "Full Integration",
    description: "Add-on is fully absorbed into platform — one brand, one team, one system.",
    activeWorkstreams: ["day1", "hr", "finance", "it", "commercial", "operations", "legal", "culture"]
  },
  {
    value: "partial" as IntegrationStrategy,
    label: "Partial Integration",
    description: "Shared services and reporting integrated; operations remain largely independent.",
    activeWorkstreams: ["day1", "hr", "finance", "it", "commercial", "legal", "culture"]
  },
  {
    value: "bolt-on" as IntegrationStrategy,
    label: "Bolt-on",
    description: "Operational integration with platform; add-on keeps its own brand and customer relationships.",
    activeWorkstreams: ["day1", "hr", "finance", "legal", "commercial", "culture"]
  },
  {
    value: "standalone" as IntegrationStrategy,
    label: "Standalone / Federated",
    description: "Add-on runs independently — only financial reporting is consolidated.",
    activeWorkstreams: ["day1", "finance", "legal"]
  }
];
