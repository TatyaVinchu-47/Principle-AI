import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { userSubmittedAdapter } from "@/lib/ingestion/adapters";
import { ingestItem } from "@/lib/ingestion/ingest";

const BodySchema = z.object({
  url: z.string().url().optional(),
  text: z.string().optional(),
});

/**
 * POST /api/ingest
 * Manual hiring-post submission. Authenticated users can submit a URL and/or
 * pasted text. The item is classified and stored; user-submitted items land in
 * 'pending' for admin verification (trust & safety).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success || (!parsed.data.url && !parsed.data.text)) {
    return NextResponse.json(
      { error: "Provide a hiring-post URL or pasted text." },
      { status: 400 },
    );
  }

  const items = await userSubmittedAdapter.fetchItems({
    url: parsed.data.url,
    text: parsed.data.text,
    userId: user.id,
  });

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "Couldn't read that URL automatically. Please paste the post text instead.",
      },
      { status: 422 },
    );
  }

  const result = await ingestItem(items[0]);

  // Log the submission event.
  await supabase.from("events").insert({
    user_id: user.id,
    type: "hiring_post_submitted",
    entity: "job",
    entity_id: result.jobId ?? null,
    metadata: {
      status: result.status,
      hidden_job_score: result.hiddenJobScore,
      scam_score: result.scamScore,
    },
  });

  return NextResponse.json({
    status: result.status,
    reason: result.reason,
    jobId: result.jobId,
    classification: result.classification,
    hiddenJobScore: result.hiddenJobScore,
    scamScore: result.scamScore,
  });
}
