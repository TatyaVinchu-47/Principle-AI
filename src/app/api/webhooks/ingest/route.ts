import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ingestItem, type IngestSource } from "@/lib/ingestion/ingest";

/**
 * POST /api/webhooks/ingest
 * Machine-to-machine ingestion endpoint for automation (e.g. n8n scheduled
 * workflows, approved API providers). Protected by a shared secret header
 * rather than a user session.
 *
 * Header: x-ingest-secret: <INGEST_WEBHOOK_SECRET>
 * Body: { items: [{ rawText, sourceUrl?, sourceKind }] }
 *
 * This route is in the middleware public list but gated by the secret here.
 */
const ItemSchema = z.object({
  rawText: z.string().min(1),
  sourceUrl: z.string().url().optional().nullable(),
  sourceKind: z
    .enum(["career_page", "public_feed", "x_signal", "user_submitted", "api_provider"])
    .default("public_feed"),
});
const BodySchema = z.object({ items: z.array(ItemSchema).min(1).max(50) });

export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Ingestion webhook is not configured." },
      { status: 503 },
    );
  }
  if (request.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const results = [];
  for (const item of parsed.data.items) {
    const res = await ingestItem({
      rawText: item.rawText,
      sourceUrl: item.sourceUrl ?? null,
      sourceKind: item.sourceKind as IngestSource,
    });
    results.push({
      status: res.status,
      jobId: res.jobId,
      role: res.classification.role,
      company: res.classification.company,
      hiddenJobScore: res.hiddenJobScore,
      scamScore: res.scamScore,
    });
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ processed: results.length, summary, results });
}
