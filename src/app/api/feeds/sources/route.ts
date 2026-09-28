import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAllFeeds } from "@/lib/feedIngestor";

export async function GET() {
  const sources = await prisma.feedSource.findMany({
    orderBy: [{ language: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { posts: true },
      },
    },
  });
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const url = (body.url || "").trim();
    const language = body.language === "ES" ? "ES" : "EN";
    const category = (body.category || "Custom Feed").trim();

    if (!name || !url) {
      return NextResponse.json(
        { error: "Source name and valid RSS URL are required." },
        { status: 400 }
      );
    }

    let siteUrl = url;
    try {
      const parsed = new URL(url);
      siteUrl = `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return NextResponse.json(
        { error: "Invalid RSS URL format." },
        { status: 400 }
      );
    }

    const source = await prisma.feedSource.upsert({
      where: { url },
      update: { name, language, category, enabled: true },
      create: {
        name,
        url,
        siteUrl,
        language,
        category,
        enabled: true,
      },
    });

    // Immediately attempt to sync the newly added feed
    const syncResult = await syncAllFeeds(source.id);

    return NextResponse.json({ source, syncResult });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add source";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled } = body;

    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Source id and enabled boolean are required." },
        { status: 400 }
      );
    }

    const source = await prisma.feedSource.update({
      where: { id },
      data: { enabled },
    });

    return NextResponse.json({ source });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update source";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
