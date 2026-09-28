import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { syncAllFeeds } from "../src/lib/feedIngestor";
import { getFallbackArticleImage } from "../src/lib/fallbackImages";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CiberNews with 100% real cybersecurity RSS feeds...");

  // 1. Seed Default Users
  const analystUser = await prisma.user.upsert({
    where: { username: "analyst" },
    update: {},
    create: {
      username: "analyst",
      email: "analyst@cibernews.local",
      passwordHash: hashPassword("cyber123"),
      role: "SOC ANALYST",
      avatarColor: "#10b981",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { username: "zero_cool" },
    update: {},
    create: {
      username: "zero_cool",
      email: "admin@cibernews.local",
      passwordHash: hashPassword("admin123"),
      role: "THREAT RESEARCHER",
      avatarColor: "#06b6d4",
    },
  });

  // Remove any old mock/broken URLs or obsolete feeds
  await prisma.post.deleteMany({
    where: {
      OR: [
        { url: { contains: "2026/09/" } },
        { url: { contains: "spectrestealer-malware-analysis-2026" } },
      ],
    },
  });
  await prisma.feedSource.deleteMany({
    where: { url: "https://www.incibe.es/feed/avisos-sci" },
  });

  // 2. Seed Bilingual Cybersecurity RSS Feed Sources (EN + ES)
  const defaultSources = [
    {
      name: "The Hacker News",
      url: "https://feeds.feedburner.com/TheHackersNews",
      siteUrl: "https://thehackernews.com",
      language: "EN",
      category: "Breaking Threats",
    },
    {
      name: "BleepingComputer",
      url: "https://www.bleepingcomputer.com/feed/",
      siteUrl: "https://www.bleepingcomputer.com",
      language: "EN",
      category: "Malware & Breaches",
    },
    {
      name: "CISA Advisories",
      url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
      siteUrl: "https://www.cisa.gov",
      language: "EN",
      category: "Official Advisories",
    },
    {
      name: "Krebs on Security",
      url: "https://krebsonsecurity.com/feed/",
      siteUrl: "https://krebsonsecurity.com",
      language: "EN",
      category: "Cybercrime Investigation",
    },
    {
      name: "Dark Reading",
      url: "https://www.darkreading.com/rss.xml",
      siteUrl: "https://www.darkreading.com",
      language: "EN",
      category: "Enterprise Security",
    },
    {
      name: "Una al Día (Hispasec)",
      url: "https://unaaldia.hispasec.com/feed",
      siteUrl: "https://unaaldia.hispasec.com",
      language: "ES",
      category: "Ciberseguridad ES",
    },
    {
      name: "WeLiveSecurity (ES)",
      url: "https://www.welivesecurity.com/es/rss/feed/",
      siteUrl: "https://www.welivesecurity.com/es/",
      language: "ES",
      category: "Investigación ES",
    },
    {
      name: "Kaspersky Daily (ES)",
      url: "https://latam.kaspersky.com/blog/feed/",
      siteUrl: "https://latam.kaspersky.com/blog/",
      language: "ES",
      category: "Amenazas & Análisis ES",
    },
  ];

  for (const src of defaultSources) {
    await prisma.feedSource.upsert({
      where: { url: src.url },
      update: {
        name: src.name,
        language: src.language,
        category: src.category,
        siteUrl: src.siteUrl,
      },
      create: src,
    });
  }

  // 3. Fetch Live Articles & Images from all RSS Sources
  console.log("Fetching live RSS articles and OpenGraph cover images...");
  const syncResult = await syncAllFeeds();
  console.log(
    `Synced ${syncResult.sourcesSynced} sources, +${syncResult.newPostsCount} new articles.`
  );

  // 4. Add initial forum comments to top live articles if none exist yet
  const topLivePosts = await prisma.post.findMany({
    where: { postType: "NEWS" },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  for (const post of topLivePosts) {
    const count = await prisma.comment.count({ where: { postId: post.id } });
    if (count === 0) {
      const c1 = await prisma.comment.create({
        data: {
          postId: post.id,
          userId: analystUser.id,
          authorName: analystUser.username,
          authorRole: analystUser.role,
          content:
            post.language === "ES"
              ? "Artículo verificado desde la fuente oficial. Recomendamos revisar indicadores y aplicar las mitigaciones descritas."
              : "Tracking this report in our SOC feed. Worth reviewing the indicators and vendor guidance in the linked advisory.",
          score: 5,
        },
      });

      await prisma.comment.create({
        data: {
          postId: post.id,
          userId: adminUser.id,
          authorName: adminUser.username,
          authorRole: adminUser.role,
          parentId: c1.id,
          content:
            post.language === "ES"
              ? "De acuerdo, añadido a nuestras alertas de seguimiento de esta semana."
              : "Bookmarked for our weekly threat intelligence briefing.",
          score: 3,
        },
      });
    }
  }

  // 5. Guarantee 100% of posts in SQLite have a non-null imageUrl
  const missingImgPosts = await prisma.$queryRaw<
    Array<{ id: string; title: string; tags: string }>
  >`SELECT id, title, tags FROM Post WHERE imageUrl IS NULL OR imageUrl = ''`;

  for (const row of missingImgPosts) {
    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(row.tags || "[]");
    } catch {
      parsedTags = [];
    }
    const img = getFallbackArticleImage(row.id || row.title, parsedTags);
    await prisma.$executeRaw`UPDATE Post SET imageUrl = ${img} WHERE id = ${row.id}`;
  }

  console.log(
    `Backfilled ${missingImgPosts.length} posts with editorial photography. CiberNews database ready!`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
