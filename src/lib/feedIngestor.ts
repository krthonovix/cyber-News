import Parser from "rss-parser";
import { prisma } from "./prisma";
import { classifyArticle, stripHtml } from "./classifier";
import { getFallbackArticleImage } from "./fallbackImages";

type CustomItem = {
  "media:content"?: { $?: { url?: string }; url?: string };
  "media:thumbnail"?: { $?: { url?: string }; url?: string };
  "content:encoded"?: string;
  description?: string;
  author?: string;
};

const parser: Parser<Record<string, unknown>, CustomItem> = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
      ["description", "description"],
    ],
  },
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export interface SyncSummary {
  sourcesSynced: number;
  sourcesFailed: number;
  newPostsCount: number;
  errors: Array<{ source: string; error: string }>;
  timestamp: string;
}

function extractImageFromRssItem(item: Parser.Item & CustomItem): string | null {
  // 1. Check standard RSS enclosure
  if (item.enclosure?.url && /^https?:\/\//i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }

  // 2. Check media:content or media:thumbnail
  const mediaContentUrl =
    item["media:content"]?.$?.url || item["media:content"]?.url;
  if (mediaContentUrl && /^https?:\/\//i.test(mediaContentUrl)) {
    return mediaContentUrl;
  }

  const mediaThumbUrl =
    item["media:thumbnail"]?.$?.url || item["media:thumbnail"]?.url;
  if (mediaThumbUrl && /^https?:\/\//i.test(mediaThumbUrl)) {
    return mediaThumbUrl;
  }

  // 3. Check <img> tag inside content:encoded, content, or description
  const htmlPayloads = [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
  ].filter(Boolean) as string[];

  for (const html of htmlPayloads) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1] && /^https?:\/\//i.test(imgMatch[1])) {
      if (!/feedburner|1x1|pixel|tracker/i.test(imgMatch[1])) {
        return imgMatch[1];
      }
    }
  }

  return null;
}

async function fetchOgImage(articleUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    let htmlChunk = "";
    const decoder = new TextDecoder();
    while (htmlChunk.length < 45000) {
      const { done, value } = await reader.read();
      if (done) break;
      htmlChunk += decoder.decode(value, { stream: true });
      if (htmlChunk.includes("</head>")) break;
    }
    await reader.cancel().catch(() => {});

    const ogMatch =
      htmlChunk.match(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i
      ) ||
      htmlChunk.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i
      );

    if (ogMatch && ogMatch[1]) {
      const rawImg = ogMatch[1].replace(/&amp;/g, "&").trim();
      if (/^https?:\/\//i.test(rawImg)) return rawImg;
      if (rawImg.startsWith("/")) {
        const parsed = new URL(articleUrl);
        return `${parsed.protocol}//${parsed.host}${rawImg}`;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncAllFeeds(specificSourceId?: string): Promise<SyncSummary> {
  const sources = await prisma.feedSource.findMany({
    where: specificSourceId
      ? { id: specificSourceId }
      : { enabled: true },
  });

  let sourcesSynced = 0;
  let sourcesFailed = 0;
  let newPostsCount = 0;
  const errors: Array<{ source: string; error: string }> = [];

  // Step 1: Fetch all RSS feeds over HTTP concurrently
  const fetchedFeeds = await Promise.all(
    sources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        return { source, items: (feed.items || []).slice(0, 12), error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown RSS error";
        return { source, items: [], error: message };
      }
    })
  );

  // Step 2: Process items & persist into SQLite sequentially
  for (const result of fetchedFeeds) {
    const { source, items, error } = result;
    if (error) {
      sourcesFailed++;
      errors.push({ source: source.name, error });
      continue;
    }

    try {
      for (const item of items) {
        const title = stripHtml(item.title || "").trim();
        const url = (item.link || item.guid || "").trim();
        if (!title || !url || !/^https?:\/\//i.test(url)) continue;

        const existingRows = await prisma.$queryRaw<
          Array<{ id: string; imageUrl: string | null }>
        >`SELECT id, imageUrl FROM Post WHERE url = ${url} LIMIT 1`;

        if (existingRows.length > 0) {
          const existing = existingRows[0];
          if (!existing.imageUrl) {
            const classification = classifyArticle(title, "");
            const extractedImg =
              extractImageFromRssItem(item) ||
              (await fetchOgImage(url)) ||
              getFallbackArticleImage(url, classification.tags);
            if (extractedImg) {
              await prisma.$executeRaw`UPDATE Post SET imageUrl = ${extractedImg} WHERE id = ${existing.id}`;
            }
          }
          continue;
        }

        const rawSummary =
          item.contentSnippet ||
          item.summary ||
          item.content ||
          item.description ||
          "";
        const cleanSummary = stripHtml(rawSummary).slice(0, 650);
        const cleanContent = stripHtml(
          item["content:encoded"] || item.content || rawSummary
        ).slice(0, 3500);

        const classification = classifyArticle(title, cleanSummary);

        const imageUrl =
          extractImageFromRssItem(item) ||
          (await fetchOgImage(url)) ||
          getFallbackArticleImage(url, classification.tags);

        const publishedDate =
          item.isoDate || item.pubDate
            ? new Date(item.isoDate || item.pubDate!)
            : new Date();
        const validDate = isNaN(publishedDate.getTime())
          ? new Date()
          : publishedDate;

        const initialScore =
          classification.severity === "CRITICAL"
            ? 12
            : classification.severity === "HIGH"
            ? 7
            : classification.severity === "MEDIUM"
            ? 4
            : 2;

        const created = await prisma.post.create({
          data: {
            title,
            url,
            summary:
              cleanSummary ||
              `Breaking cybersecurity report from ${source.name}. Click to read the full technical analysis.`,
            content: cleanContent || cleanSummary,
            authorName: item.creator || item.author || source.name,
            sourceId: source.id,
            postType: "NEWS",
            language: source.language,
            severity: classification.severity,
            cveIds: JSON.stringify(classification.cveIds),
            tags: JSON.stringify(classification.tags),
            score: initialScore,
            publishedAt: validDate,
          },
        });

        if (imageUrl) {
          await prisma.$executeRaw`UPDATE Post SET imageUrl = ${imageUrl} WHERE id = ${created.id}`;
        }

        newPostsCount++;
      }

      await prisma.feedSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() },
      });
      sourcesSynced++;
    } catch (err: unknown) {
      sourcesFailed++;
      const message = err instanceof Error ? err.message : "Database write error";
      errors.push({ source: source.name, error: message });
    }
  }

  return {
    sourcesSynced,
    sourcesFailed,
    newPostsCount,
    errors,
    timestamp: new Date().toISOString(),
  };
}
