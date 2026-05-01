import { chatWithUsage } from './llm';

export type RoutingDecision = {
  mode: 'single' | 'panel';
  single_agent_id?: string;
  reasoning: string;
};

const PANEL_FALLBACK: RoutingDecision = { mode: 'panel', reasoning: 'fallback' };

const ROUTER_SYSTEM_PROMPT = `You are a query classifier for a NYC/Columbia student social platform.

Classify the user query into one of two modes:

**single** — simple utility queries that need exactly ONE answer:
- Translation requests ("translate X", "what does X mean in English", "怎么说", "翻译")
- Word/phrase lookup or definition
- Unit conversion, math calculation
- Simple factual question with one clear answer
- Weather or current time in a city
- "How do I spell X"

**panel** — everything else, especially:
- Opinions, recommendations, decisions ("should I", "is it worth", "best X", "recommend")
- Housing/rental questions (complex, needs local expertise + deal analysis)
- Career/offer decisions
- Social questions, relationships
- Startup/business strategy
- Anything where multiple perspectives add value
- Ambiguous queries

For **single** mode, also pick the best agent_id:
- "sage" — translations, language, academic, Chinese/English queries
- "mercer" — deals, prices, market rates, negotiation
- "iris" — events, nightlife, culture, what's happening this weekend
- "atlas" — NYC local info, neighborhoods, specific places, transit
- "ember" — coding, technical, startup execution
- "nova" — general factual questions, default single-agent

When in doubt, output panel. Ambiguous = panel.

Respond ONLY with valid JSON, no explanation outside JSON:
{"mode": "single"|"panel", "agent_id": "<id or omit if panel>", "reasoning": "<10 words max>"}`;

export async function classifyQuery(content: string): Promise<RoutingDecision> {
  try {
    const result = await Promise.race([
      chatWithUsage(
        [
          { role: 'system', content: ROUTER_SYSTEM_PROMPT },
          { role: 'user', content: content.slice(0, 500) },
        ],
        { model: 'openai/gpt-4o-mini', temperature: 0, max_tokens: 80 }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('router timeout')), 5000)
      ),
    ]);

    const raw = result.content.trim();
    // Strip markdown code fences if present
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(clean) as { mode?: string; agent_id?: string; reasoning?: string };

    const mode = parsed.mode === 'single' ? 'single' : 'panel';
    const validAgentIds = ['nova', 'atlas', 'lumen', 'ember', 'sage', 'mercer', 'iris'];
    const single_agent_id =
      mode === 'single' && parsed.agent_id && validAgentIds.includes(parsed.agent_id)
        ? parsed.agent_id
        : mode === 'single'
        ? 'nova'
        : undefined;

    return { mode, single_agent_id, reasoning: parsed.reasoning ?? '' };
  } catch {
    return PANEL_FALLBACK;
  }
}
