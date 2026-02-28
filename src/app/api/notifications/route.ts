import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications — Get current user's notifications
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limitParam = url.searchParams.get("limit");
  let limit = 20;
  if (limitParam !== null) {
    const parsedLimit = Number(limitParam);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(50, parsedLimit);
    }
  }

  const where: Record<string, unknown> = { userId: session.user.id };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

/**
 * PATCH /api/notifications — Mark notifications as read
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { ids, markAllRead } = body as { ids?: unknown; markAllRead?: unknown };

  if (typeof markAllRead !== "undefined" && typeof markAllRead !== "boolean") {
    return NextResponse.json({ error: "markAllRead must be a boolean" }, { status: 400 });
  }

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  } else if (Array.isArray(ids) && ids.length > 0) {
    if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json({ error: "Each id must be a non-empty string" }, { status: 400 });
    }
    await prisma.notification.updateMany({
      where: { id: { in: ids as string[] }, userId: session.user.id },
      data: { read: true },
    });
  } else {
    return NextResponse.json({ error: "Provide markAllRead: true or ids array" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
