import "server-only";
import type { IngestInput, IngestSource } from "./ingest";

/**
 * Ingestion adapters. Each adapter knows how to turn a source into one or more
 * raw IngestInput items. The design keeps LinkedIn-style scraping OUT: sources
 * are official APIs, permitted providers, public pages, or user submissions.
 *
 * Phase 1 ships the user-submitted + raw-URL adapters. Phase 2 can register
 * scheduled adapters (career pages, public feeds, approved API providers)
 * behind the same interface and run them from an n8n workflow hitting the
 * ingestion API.
 */

export interface Adapter {
  kind: IngestSource;
  /** Produce raw ingest items. */
  fetchItems(options: Record<string, unknown>): Promise<IngestInput[]>;
}

/** Turns a user-submitted hiring post (URL and/or pasted text) into an item. */
export const userSubmittedAdapter: Adapter = {
  kind: "user_submitted",
  async fetchItems(options) {
    const url = (options.url as string) || null;
    let text = (options.text as string) || "";

    // If only a URL is provided, attempt a best-effort public fetch of the page
    // text. Many public pages allow this; private/authenticated pages will not
    // and the user can paste the text instead.
    if (url && !text) {
      text = await fetchPublicText(url);
    }

    if (!text.trim()) return [];
    return [
      {
        rawText: text.trim(),
        sourceUrl: url,
        sourceKind: "user_submitted",
        submittedBy: (options.userId as string) ?? null,
      },
    ];
  },
};

/**
 * Best-effort public page text fetch. Strips tags crudely. Fails gracefully to
 * empty string so the caller can ask the user to paste text instead.
 */
async function fetchPublicText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PrincipleAI-Ingest/1.0 (+public)" },
      // Avoid hanging the request.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("text/plain")) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000);
  } catch {
    return "";
  }
}

/**
 * Registry of available adapters. Phase 2+ adapters (career_page, public_feed,
 * x_signal, api_provider) plug in here with the same interface.
 */
export const adapters: Record<string, Adapter> = {
  user_submitted: userSubmittedAdapter,
};
