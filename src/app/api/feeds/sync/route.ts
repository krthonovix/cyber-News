import { NextRequest, NextResponse } from "next/server";
import { syncAllFeeds } from "@/lib/feedIngestor";

export async function POST(req: NextRequest) {
  try {
    let sourceId: string | undefined;
    try {
      const body = await req.json();
      sourceId = body?.sourceId;
    } catch {
      // No JSON body provided, sync all enabled feeds
    }

    const summary = await syncAllFeeds(sourceId);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync feeds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
