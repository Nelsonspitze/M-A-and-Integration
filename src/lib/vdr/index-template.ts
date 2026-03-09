import type { VDRFolder } from "./types";

// Standard M&A due diligence index — based on common VDR practice (Merrill, Intralinks, Datasite)

export const DEFAULT_VDR_INDEX: Omit<VDRFolder, "createdAt">[] = [
  // ── 1. Corporate & Legal ─────────────────────────────────────────────────
  { id: "f-1",   parentId: null,  index: "1",    name: "Corporate & Legal",          defaultClassification: "restricted",         description: "Corporate governance documents and legal structure" },
  { id: "f-1-1", parentId: "f-1", index: "1.1",  name: "Articles & Statutes",        defaultClassification: "restricted"          },
  { id: "f-1-2", parentId: "f-1", index: "1.2",  name: "Board & Shareholder Minutes", defaultClassification: "restricted"         },
  { id: "f-1-3", parentId: "f-1", index: "1.3",  name: "Share Structure & Cap Table", defaultClassification: "highly-restricted"  },
  { id: "f-1-4", parentId: "f-1", index: "1.4",  name: "Licenses & Regulatory",      defaultClassification: "deal-confidential"   },
  { id: "f-1-5", parentId: "f-1", index: "1.5",  name: "Material Contracts",         defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },

  // ── 2. Financial Information ─────────────────────────────────────────────
  { id: "f-2",   parentId: null,  index: "2",    name: "Financial Information",       defaultClassification: "restricted",         description: "Historical financials, forecasts and debt" },
  { id: "f-2-1", parentId: "f-2", index: "2.1",  name: "Historical Financials",      defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-2-2", parentId: "f-2", index: "2.2",  name: "Management Accounts",        defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-2-3", parentId: "f-2", index: "2.3",  name: "Budget & Forecast",          defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-2-4", parentId: "f-2", index: "2.4",  name: "Debt & Working Capital",     defaultClassification: "highly-restricted"   },
  { id: "f-2-5", parentId: "f-2", index: "2.5",  name: "Financial Models",           defaultClassification: "highly-restricted"   },

  // ── 3. Tax ───────────────────────────────────────────────────────────────
  { id: "f-3",   parentId: null,  index: "3",    name: "Tax",                        defaultClassification: "restricted",         description: "Tax returns, advice and transfer pricing" },
  { id: "f-3-1", parentId: "f-3", index: "3.1",  name: "Tax Returns",                defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-3-2", parentId: "f-3", index: "3.2",  name: "Tax Advice & Rulings",       defaultClassification: "restricted"          },
  { id: "f-3-3", parentId: "f-3", index: "3.3",  name: "Transfer Pricing",           defaultClassification: "highly-restricted"   },

  // ── 4. Commercial & Customers ────────────────────────────────────────────
  { id: "f-4",   parentId: null,  index: "4",    name: "Commercial & Customers",     defaultClassification: "deal-confidential",  description: "Customer contracts, pipeline and pricing" },
  { id: "f-4-1", parentId: "f-4", index: "4.1",  name: "Key Customer Contracts",     defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-4-2", parentId: "f-4", index: "4.2",  name: "Customer Data & Pipeline",   defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-4-3", parentId: "f-4", index: "4.3",  name: "Pricing & Margin Analysis",  defaultClassification: "restricted"          },
  { id: "f-4-4", parentId: "f-4", index: "4.4",  name: "Sales & Distribution",       defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },

  // ── 5. HR & People ───────────────────────────────────────────────────────
  { id: "f-5",   parentId: null,  index: "5",    name: "HR & People",                defaultClassification: "highly-restricted",  description: "Org chart, employment contracts and compensation — GDPR sensitive" },
  { id: "f-5-1", parentId: "f-5", index: "5.1",  name: "Organisation Chart",         defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-5-2", parentId: "f-5", index: "5.2",  name: "Key Employee Contracts",     defaultClassification: "highly-restricted",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-5-3", parentId: "f-5", index: "5.3",  name: "Compensation & Benefits",    defaultClassification: "highly-restricted"   },
  { id: "f-5-4", parentId: "f-5", index: "5.4",  name: "Pension & Liabilities",      defaultClassification: "restricted"          },
  { id: "f-5-5", parentId: "f-5", index: "5.5",  name: "Employee Headcount Data",    defaultClassification: "highly-restricted"   },

  // ── 6. IT & Systems ──────────────────────────────────────────────────────
  { id: "f-6",   parentId: null,  index: "6",    name: "IT & Systems",               defaultClassification: "restricted",         description: "IT infrastructure, software licenses and cybersecurity" },
  { id: "f-6-1", parentId: "f-6", index: "6.1",  name: "IT Infrastructure",          defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },
  { id: "f-6-2", parentId: "f-6", index: "6.2",  name: "Software & Licenses",        defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-6-3", parentId: "f-6", index: "6.3",  name: "Cybersecurity & Data",       defaultClassification: "restricted"          },
  { id: "f-6-4", parentId: "f-6", index: "6.4",  name: "System Architecture",        defaultClassification: "restricted",         allowedUploaderParties: ["buyer","seller"] },

  // ── 7. Real Estate & Assets ──────────────────────────────────────────────
  { id: "f-7",   parentId: null,  index: "7",    name: "Real Estate & Assets",       defaultClassification: "deal-confidential",  description: "Property leases and asset register" },
  { id: "f-7-1", parentId: "f-7", index: "7.1",  name: "Property Leases",            defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-7-2", parentId: "f-7", index: "7.2",  name: "Asset Register",             defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-7-3", parentId: "f-7", index: "7.3",  name: "Capital Expenditure",        defaultClassification: "restricted"          },

  // ── 8. Regulatory & Compliance ───────────────────────────────────────────
  { id: "f-8",   parentId: null,  index: "8",    name: "Regulatory & Compliance",    defaultClassification: "deal-confidential",  description: "Permits, environmental and insurance" },
  { id: "f-8-1", parentId: "f-8", index: "8.1",  name: "Permits & Authorisations",   defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-8-2", parentId: "f-8", index: "8.2",  name: "Environmental Reports",      defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-8-3", parentId: "f-8", index: "8.3",  name: "Insurance Policies",         defaultClassification: "deal-confidential",  allowedUploaderParties: ["buyer","seller"] },
  { id: "f-8-4", parentId: "f-8", index: "8.4",  name: "Legal Proceedings",          defaultClassification: "restricted"          },

  // ── 9. Management & Strategy ─────────────────────────────────────────────
  { id: "f-9",   parentId: null,  index: "9",    name: "Management & Strategy",      defaultClassification: "restricted",         description: "Management presentations, business plans and market analysis" },
  { id: "f-9-1", parentId: "f-9", index: "9.1",  name: "Management Presentations",   defaultClassification: "restricted"          },
  { id: "f-9-2", parentId: "f-9", index: "9.2",  name: "Business Plans",             defaultClassification: "restricted"          },
  { id: "f-9-3", parentId: "f-9", index: "9.3",  name: "Market & Competitive Analysis", defaultClassification: "restricted"       },
  { id: "f-9-4", parentId: "f-9", index: "9.4",  name: "Investment Thesis",          defaultClassification: "highly-restricted"   },

  // ── 10. Seller Uploads ───────────────────────────────────────────────────
  { id: "f-10",  parentId: null,  index: "10",   name: "Seller Uploads",             defaultClassification: "deal-confidential",  description: "Documents provided by the seller during due diligence", allowedUploaderParties: ["seller","buyer"] },
  { id: "f-10-1",parentId:"f-10", index: "10.1", name: "Seller Provided Documents",  defaultClassification: "deal-confidential",  allowedUploaderParties: ["seller","buyer"] },
  { id: "f-10-2",parentId:"f-10", index: "10.2", name: "Q&A Responses",              defaultClassification: "deal-confidential",  allowedUploaderParties: ["seller","buyer"] },
];
