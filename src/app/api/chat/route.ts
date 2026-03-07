import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { INTEGRATION_STRATEGIES } from "@/lib/pmi/library";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { messages, item, deal, wsStrategy, task } = await req.json();

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
