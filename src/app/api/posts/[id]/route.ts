import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        comments: {
          orderBy: { createdAt: "asc" },
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

    if (!post) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const imgRows = await prisma.$queryRaw<
      Array<{ imageUrl: string | null }>
    >`SELECT imageUrl FROM Post WHERE id = ${params.id} LIMIT 1`;

    return NextResponse.json({
      post: {
        ...post,
        imageUrl: imgRows[0]?.imageUrl ?? null,
        cveIds: JSON.parse(post.cveIds || "[]"),
        tags: JSON.parse(post.tags || "[]"),
        userVote:
          user && Array.isArray(post.votes) && post.votes.length > 0
            ? post.votes[0].value
            : 0,
        isBookmarked:
          user && Array.isArray(post.bookmarks) && post.bookmarks.length > 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to vote or bookmark threads." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body; // "vote" | "bookmark"
    const postId = params.id;

    if (action === "vote") {
      const value = body.value === -1 ? -1 : 1;
      const existingVote = await prisma.vote.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId,
          },
        },
      });

      let scoreDelta = 0;
      let newUserVote = 0;

      if (existingVote) {
        if (existingVote.value === value) {
          // Toggle off vote
          await prisma.vote.delete({ where: { id: existingVote.id } });
          scoreDelta = -value;
          newUserVote = 0;
        } else {
          // Flip vote
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { value },
          });
          scoreDelta = value * 2;
          newUserVote = value;
        }
      } else {
        await prisma.vote.create({
          data: {
            userId: user.id,
            postId,
            value,
          },
        });
        scoreDelta = value;
        newUserVote = value;
      }

      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          score: { increment: scoreDelta },
        },
      });

      return NextResponse.json({
        score: updatedPost.score,
        userVote: newUserVote,
      });
    }

    if (action === "bookmark") {
      const existingBookmark = await prisma.bookmark.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId,
          },
        },
      });

      let isBookmarked = false;
      if (existingBookmark) {
        await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
        isBookmarked = false;
      } else {
        await prisma.bookmark.create({
          data: {
            userId: user.id,
            postId,
          },
        });
        isBookmarked = true;
      }

      return NextResponse.json({ isBookmarked });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update post";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
