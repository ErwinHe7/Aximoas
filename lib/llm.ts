import OpenAI from 'openai';

let client: OpenAI | null = null;

export function llm() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    if (!apiKey) throw new Error('OPENAI_API_KEY missing');
    client = new OpenAI({ apiKey, baseURL });
  }
  return client;
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function chat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { model?: string; temperature?: number; max_tokens?: number } = {}
) {
  const res = await llm().chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.max_tokens ?? 400,
    messages,
  });
  return res.choices[0]?.message?.content ?? '';
}
