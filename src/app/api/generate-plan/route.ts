import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { INTEGRATION_STRATEGIES } from "@/lib/pmi/library";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { item, deal, strategy } = await req.json();

  const strategyLabel = INTEGRATION_STRATEGIES.find((s) => s.value === strategy)?.label ?? strategy;
  const overallStrategyLabel = INTEGRATION_STRATEGIES.find((s) => s.value === deal.overallStrategy)?.label ?? deal.overallStrategy;

  const prompt = `You are an expert post-merger integration (PMI) consultant helping a private equity-backed platform company execute an acquisition integration.

## Deal Context
- **Integration**: ${deal.platformCompany} acquires ${deal.addOnCompany}
- **Overall Integration Strategy**: ${overallStrategyLabel}
- **This Workstream Strategy**: ${strategyLabel}
- **Days Since Close**: ${Math.max(0, Math.floor((Date.now() - new Date(deal.closeDate).getTime()) / (1000 * 60 * 60 * 24)))}

## Deal Brief
${deal.dealBrief || "No deal brief provided — apply general best practices."}

## Integration Item to Plan
**Title**: ${item.title}
**Description**: ${item.description}
**Typical Timeline**: ${item.typicalTimeline}
**Suggested Owner**: ${item.owner}

## Known Best Practices for This Item
${item.bestPractices.map((bp: string, i: number) => `${i + 1}. ${bp}`).join("\n")}

## Known Risk Flags
${item.riskFlags.map((rf: string) => `- ⚠ ${rf}`).join("\n")}

## Your Task
Generate a **specific, practical action plan** for this integration item, tailored to this deal's context and the ${strategyLabel} strategy.

Format your response as:

**PHASE 1 — [Timeline, e.g. Week 1-2]**
- [ ] Specific action step
- [ ] Specific action step

**PHASE 2 — [Timeline]**
- [ ] Specific action step

**Key Decisions Required**
- Decision 1 and who should make it

**Success Metrics**
- How to know this item is completed

Keep it concise, practical, and immediately actionable. Tailor specifics to the deal context provided.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const plan = message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ plan });
}
