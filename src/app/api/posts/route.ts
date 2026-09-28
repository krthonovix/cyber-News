import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { classifyArticle } from "@/lib/classifier";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const sort = searchParams.get("sort") || "hot"; // hot | new | top | critical | discussions
    const lang = searchParams.get("lang") || "ALL"; // ALL | EN | ES
    const tag = searchParams.get("tag") || "";
    const sourceId = searchParams.get("sourceId") || "";
    const bookmarked = searchParams.get("bookmarked") === "true";
    const q = (searchParams.get("q") || "").trim();

    // Build Prisma where filter
    const where: Record<string, unknown> = {};

    if (lang === "EN" || lang === "ES") {
      where.language = lang;
    }

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (sort === "critical") {
      where.OR = [{ severity: "CRITICAL" }, { severity: "HIGH" }];
    } else if (sort === "discussions") {
      where.postType = "DISCUSSION";
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    if (q) {
      where.AND = [
        {
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { cveIds: { contains: q } },
            { tags: { contains: q } },
            { authorName: { contains: q } },
          ],
        },
      ];
    }

    if (bookmarked) {
      if (!user) {
        return NextResponse.json({ posts: [], stats: { total: 0, critical: 0, cveCount: 0 } });
      }
      where.bookmarks = {
        some: { userId: user.id },
      };
    }

    const rawPosts = await prisma.post.findMany({
      where,
      take: 100,
      orderBy:
        sort === "new"
          ? { publishedAt: "desc" }
          : sort === "top"
          ? [{ score: "desc" }, { publishedAt: "desc" }]
          : { publishedAt: "desc" },
      include: {
        source: {
          select: {
            id: true,
            name: true,
            language: true,
            category: true,
            siteUrl: true,
          },
        },
        _count: {
          select: { comments: true },
        },
        votes: user
          ? {
              where: { userId: user.id },
              select: { value: true },
            }
          : false,
        bookmarks: user
          ? {
              where: { userId: user.id },
              select: { id: true },
            }
          : false,
      },
    });

    // Fetch imageUrl column values for returned posts
    const imageRows = await prisma.$queryRaw<
      Array<{ id: string; imageUrl: string | null }>
    >`SELECT id, imageUrl FROM Post`;
    const imageMap = new Map<string, string | null>();
    for (const row of imageRows) {
      imageMap.set(row.id, row.imageUrl);
    }

    // Transform & compute Hacker News-style "Hot" ranking score if sort === "hot"
    const now = Date.now();
    const formattedPosts = rawPosts.map((p) => {
      let parsedCves: string[] = [];
      let parsedTags: string[] = [];
      try {
        parsedCves = JSON.parse(p.cveIds || "[]");
      } catch {
        parsedCves = [];
      }
      try {
        parsedTags = JSON.parse(p.tags || "[]");
      } catch {
        parsedTags = [];
      }

      const ageHours = Math.max(
        0.5,
        (now - new Date(p.publishedAt).getTime()) / (1000 * 3600)
      );
      const commentBoost = p._count.comments * 2;
      const severityBoost =
        p.severity === "CRITICAL" ? 6 : p.severity === "HIGH" ? 3 : 0;
      const hotRank =
        (p.score + commentBoost + severityBoost + 1) /
        Math.pow(ageHours + 2, 1.35);

      return {
        id: p.id,
        title: p.title,
        url: p.url,
        imageUrl: imageMap.get(p.id) ?? null,
        summary: p.summary,
        content: p.content,
        authorName: p.authorName,
        postType: p.postType,
        language: p.language,
        severity: p.severity,
        cveIds: parsedCves,
        tags: parsedTags,
        score: p.score,
        commentCount: p._count.comments,
        publishedAt: p.publishedAt,
        source: p.source,
        userVote:
          user && Array.isArray(p.votes) && p.votes.length > 0
            ? p.votes[0].value
            : 0,
        isBookmarked:
          user && Array.isArray(p.bookmarks) && p.bookmarks.length > 0,
        hotRank,
      };
    });

    if (sort === "hot" || sort === "critical") {
      formattedPosts.sort((a, b) => b.hotRank - a.hotRank);
    }

    // Aggregate quick threat telemetry stats
    const totalCount = await prisma.post.count();
    const criticalCount = await prisma.post.count({
      where: { severity: "CRITICAL" },
    });
    const discussionCount = await prisma.post.count({
      where: { postType: "DISCUSSION" },
    });

    return NextResponse.json({
      posts: formattedPosts,
      stats: {
        total: totalCount,
        critical: criticalCount,
        discussions: discussionCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load posts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to create a forum thread." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const title = (body.title || "").trim();
    const url = (body.url || "").trim() || null;
    const content = (body.content || "").trim();
    const language = body.language === "ES" ? "ES" : "EN";
    const postType = url ? "NEWS" : "DISCUSSION";
    const customTag = (body.customTag || "").trim();

    if (!title || title.length < 5) {
      return NextResponse.json(
        { error: "Title must be at least 5 characters long." },
        { status: 400 }
      );
    }

    if (!content && !url) {
      return NextResponse.json(
        { error: "Please provide either discussion text or an external URL." },
        { status: 400 }
      );
    }

    const classification = classifyArticle(title, content);
    const tags = Array.from(
      new Set([
        ...(postType === "DISCUSSION" ? ["Forum Discussion"] : []),
        ...(customTag ? [customTag] : []),
        ...classification.tags,
      ])
    ).slice(0, 4);

    const post = await prisma.post.create({
      data: {
        title,
        url,
        summary: content.slice(0, 500) || `Shared link by @${user.username}`,
        content: content || `External link submitted by @${user.username}: ${url}`,
        authorName: user.username,
        userId: user.id,
        postType,
        language,
        severity: body.severity || classification.severity,
        cveIds: JSON.stringify(classification.cveIds),
        tags: JSON.stringify(tags),
        score: 1,
        publishedAt: new Date(),
      },
    });

    // Automatically upvote author's own post
    await prisma.vote.create({
      data: {
        userId: user.id,
        postId: post.id,
        value: 1,
      },
    });

    return NextResponse.json({ post });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
