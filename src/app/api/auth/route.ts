import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  getCurrentUser,
  hashPassword,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "logout") {
      const res = NextResponse.json({ ok: true, user: null });
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    if (action === "login") {
      const usernameOrEmail = (body.username || "").trim();
      const password = body.password || "";

      if (!usernameOrEmail || !password) {
        return NextResponse.json(
          { error: "Username and password are required." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail },
          ],
        },
      });

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json(
          { error: "Invalid credentials. Try demo account: analyst / cyber123" },
          { status: 401 }
        );
      }

      const token = createSessionToken(user.id);
      const res = NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatarColor: user.avatarColor,
        },
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });

      return res;
    }

    if (action === "register") {
      const username = (body.username || "").trim();
      const email = (body.email || `${username}@cibernews.local`).trim();
      const password = body.password || "";
      const role = (body.role || "SOC ANALYST").trim();

      if (username.length < 2 || password.length < 4) {
        return NextResponse.json(
          { error: "Username (min 2 chars) and password (min 4 chars) required." },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Username or email is already registered." },
          { status: 409 }
        );
      }

      const colors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"];
      const avatarColor = colors[Math.floor(Math.random() * colors.length)];

      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: hashPassword(password),
          role,
          avatarColor,
        },
      });

      const token = createSessionToken(user.id);
      const res = NextResponse.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatarColor: user.avatarColor,
        },
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });

      return res;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
