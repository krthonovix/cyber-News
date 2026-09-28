import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please log in to post a comment in the forum." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content = (body.content || "").trim();
    const parentId = body.parentId || null;

    if (!content) {
      return NextResponse.json(
        { error: "Comment content cannot be empty." },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        postId: params.id,
        userId: user.id,
        authorName: user.username,
        authorRole: user.role,
        parentId,
        content,
        score: 1,
      },
    });

    return NextResponse.json({ comment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
