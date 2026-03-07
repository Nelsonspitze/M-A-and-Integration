import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { INTEGRATION_STRATEGIES } from "@/lib/pmi/library";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages, item, deal, wsStrategy, task, crmContext, planContext } = await req.json();

  // ── Integration Planning mode ───────────────────────────────────────────────
  if (planContext) {
    const { step, deal: d, plan } = planContext;
    const systemMap: Record<string, string> = {
      rationale: `You are an expert M&A strategist helping a private equity firm articulate the strategic rationale for an acquisition.

Deal: ${d.platformCompany} acquires ${d.addOnCompany}
Strategy: ${d.overallStrategy}
Brief: ${d.dealBrief || "Not provided"}

Write a concise, compelling acquisition rationale (3-4 paragraphs) covering: strategic fit, why now, what capabilities are gained, and what the combined entity achieves. Be specific, avoid generic language. Use business language appropriate for a C-suite and board audience.`,

      synergies: `You are an M&A integration expert. Generate a concrete synergy map for this acquisition.

Deal: ${d.platformCompany} acquires ${d.addOnCompany}
Strategy: ${d.overallStrategy}
Brief: ${d.dealBrief || "Not provided"}
Rationale: ${plan?.dealRationale || "Not yet written"}

List 6-8 specific, realistic synergies. For each, write:
**[Category: Revenue/Cost/Capability/Market]** — Title
Description (1-2 sentences, specific and quantified where possible)
Estimated value: €Xk | Timeline: Month X

Be realistic and deal-specific. No generic synergies.`,

      workstreams: `You are a PMI specialist. Recommend integration approach for each workstream.

Deal: ${d.platformCompany} acquires ${d.addOnCompany}
Strategy: ${d.overallStrategy}
Brief: ${d.dealBrief || "Not provided"}
Synergies identified: ${plan?.synergyMap?.map((s: { title: string }) => s.title).join(", ") || "none yet"}

For each active workstream (Day 1, HR, Finance, IT, Commercial, Operations, Legal, Culture), recommend:
- Integration strategy: Full Integration / Partial Integration / Bolt-on / Standalone
- One-paragraph rationale explaining why
- 1-2 key risks

Format: **[Workstream]** — [Strategy]
Rationale: ...
Key risks: ...`,

      timeline: `You are a PMI project manager. Draft a milestone timeline for this integration.

Deal: ${d.platformCompany} acquires ${d.addOnCompany}
Strategy: ${d.overallStrategy}
Brief: ${d.dealBrief || "Not provided"}
Workstream decisions: ${plan?.workstreamDecisions?.map((w: { workstreamId: string; strategy: string }) => `${w.workstreamId}: ${w.strategy}`).join(", ") || "not set"}

Draft 4-5 key milestones for each phase:
**Day 1** — First day priorities
**Month 1 (Days 2–30)** — Stabilisation
**Month 3 (Days 31–90)** — Integration in motion
**Month 6 (Days 91–180)** — Deep integration
**Month 12 (Days 181–365)** — Full value realisation

Be specific to this deal. Each milestone should be an action, not a vague goal.`,
    };

    const system = systemMap[step] ?? systemMap.rationale;

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
      return new Response("ANTHROPIC_API_KEY is not configured.", { status: 500 });
    }
    try {
      const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: 2000, system, messages });
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                controller.enqueue(new TextEncoder().encode(event.delta.text));
              }
            }
          } catch (err) {
            controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`));
          } finally { controller.close(); }
        },
      });
      return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (err) {
      return new Response(err instanceof Error ? err.message : "Unknown error", { status: 500 });
    }
  }

  // ── CRM Task mode ──────────────────────────────────────────────────────────
  if (crmContext) {
    const { company, crmTask, deptName } = crmContext;
    const system = `You are an expert M&A advisor and due diligence specialist embedded in twinrope, a private equity M&A and integration platform.

You are helping evaluate an acquisition target. Here is the full context:

## Target Company
- Name: ${company.name}
- Sector: ${company.sector}
- Country: ${company.country ?? "—"}
- EBITDA estimate: ${company.ebitdaEst ? `€${company.ebitdaEst}k` : "not specified"}
- Headcount (FTE): ${company.fte ?? "not specified"}
- Pipeline stage: ${company.stage}
- Integration strategy fit: ${company.strategyFit}
- Geography fit: ${company.geographyFit}
- Professionalization level: ${company.professionalization}/5
${company.description ? `- Description: ${company.description}` : ""}

## Current Evaluation Task — ${deptName}
**${crmTask.title}**

${crmTask.description}

## Your role
- Be a practical M&A advisor, not a consultant writing a report
- Give specific, actionable guidance for this task and company
- Flag red flags, key questions, and deal breakers where relevant
- When creating checklists or information requests, use bullet points (- item)
- Keep responses focused and concise`;

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
      return new Response("ANTHROPIC_API_KEY is not configured.", { status: 500 });
    }
    try {
      const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: 1500, system, messages });
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                controller.enqueue(new TextEncoder().encode(event.delta.text));
              }
            }
          } catch (err) {
            controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`));
          } finally { controller.close(); }
        },
      });
      return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    } catch (err) {
      return new Response(err instanceof Error ? err.message : "Unknown error", { status: 500 });
    }
  }

  const strategyLabel = INTEGRATION_STRATEGIES.find(s => s.value === wsStrategy)?.label ?? wsStrategy;
  const overallLabel  = INTEGRATION_STRATEGIES.find(s => s.value === deal.overallStrategy)?.label ?? deal.overallStrategy;
  const days = Math.max(0, Math.floor((Date.now() - new Date(deal.closeDate).getTime()) / 86400000));

  // Task-level context (when chatting about a specific task)
  const taskContext = task ? `
## Specific Task
- Title: ${task.title}
- Assignee: ${task.assigneeName ?? "Unassigned"}
- Due: ${task.dueDate ?? "No due date"}
- Status: ${task.completed ? "Completed" : "Open"}
- Phase: ${task.phase ?? "No phase"}

You are helping the user work on this specific task. Help them plan it, break it down, execute it, or answer questions about it.
` : "";

  const system = `You are an expert PMI (Post-Merger Integration) advisor embedded in twinrope, helping private equity-backed companies execute integrations.

You are advising on a specific integration item. Here is the full context:

## Deal
- Integration: ${deal.platformCompany} acquires ${deal.addOnCompany}
- Overall strategy: ${overallLabel} | This workstream strategy: ${strategyLabel}
- Days since close: ${days}
- Deal brief: ${deal.dealBrief || "No brief provided."}

## Integration Item: ${item.title}
${item.description}

Typical timeline: ${item.typicalTimeline}
Suggested owner: ${item.owner}

## Best Practices
${item.bestPractices.map((bp: string, i: number) => `${i + 1}. ${bp}`).join("\n")}

## Key Risk Flags
${item.riskFlags.map((rf: string) => `⚠ ${rf}`).join("\n")}

## Team available
${deal.team?.map((m: { name: string; role: string }) => `- ${m.name} (${m.role})`).join("\n") || "No team configured yet."}

## Instructions
- Be practical, specific, and direct. No fluff.
- When creating action plans or task lists, format tasks as: - [ ] Task title (Owner: Name, Due: timeframe)
- Group tasks under phase headers: **PHASE 1 — [timeline]**
- When you have produced a complete, loadable task list, end your message with the exact text: ✅ Ready to load as tasks
- Keep responses concise. This is a working tool, not a report.
${taskContext}`;

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return new Response("ANTHROPIC_API_KEY is not configured. Add it to .env.local.", { status: 500 });
  }

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${err instanceof Error ? err.message : "Unknown error"}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(msg, { status: 500 });
  }
}
