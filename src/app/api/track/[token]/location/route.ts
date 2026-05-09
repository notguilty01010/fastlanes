import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { trackTokenLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().max(100_000).nullable().optional(),
  speed: z.number().min(-1).max(1_000).nullable().optional(),
  // Принимаем, но игнорируем - у нас createdAt серверный.
  capturedAt: z.string().datetime().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 64) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  // Rate limit до запроса в БД: токен публичный, иначе это DoS-вектор.
  const rl = trackTokenLimiter.check(token);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil(rl.retryAfterMs / 1000).toString() },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  const tracker = await prisma.tracker.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!tracker) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (tracker.status !== "active") {
    return NextResponse.json({ error: "tracker_disabled" }, { status: 410 });
  }

  if (tracker.expiresAt && tracker.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "tracker_expired" }, { status: 410 });
  }

  await prisma.locationPoint.create({
    data: {
      trackerId: tracker.id,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      accuracy: parsed.data.accuracy ?? null,
      speed: parsed.data.speed ?? null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
