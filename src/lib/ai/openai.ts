import OpenAI from "openai";

/**
 * Lazily-constructed OpenAI client. Returns null when no API key is configured
 * so callers can fall back to deterministic heuristics (keeps the app fully
 * functional for local development without a key).
 */
let _client: OpenAI | null | undefined;

export function getOpenAI(): OpenAI | null {
  if (_client !== undefined) return _client;
  const key = process.env.OPENAI_API_KEY;
  _client = key ? new OpenAI({ apiKey: key }) : null;
  return _client;
}

export const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

export function aiEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Calls the chat completions API expecting a strict JSON object response.
 * Returns the parsed object, or null if AI is unavailable / the call fails.
 */
export async function chatJSON<T>(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T | null> {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[ai] chatJSON failed, falling back:", err);
    return null;
  }
}

/** Returns an embedding vector, or null if AI is unavailable / fails. */
export async function embed(text: string): Promise<number[] | null> {
  const client = getOpenAI();
  if (!client || !text.trim()) return null;
  try {
    const res = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[ai] embed failed:", err);
    return null;
  }
}

/** Cosine similarity for two equal-length vectors; 0 when invalid. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
