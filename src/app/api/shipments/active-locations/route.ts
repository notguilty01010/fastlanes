import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type ActiveLocation = {
  shipmentId: string;
  title: string;
  status: string;
  origin: string;
  destination: string;
  manager: { name: string; email: string } | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Активный груз = всё, кроме delivered/cancelled. Берём последнюю точку
  // среди всех его трекеров (любой active-tracker сгодится).
  const shipments = await prisma.shipment.findMany({
    where: { status: { in: ["created", "waiting", "in_transit"] } },
    select: {
      id: true,
      title: true,
      status: true,
      origin: true,
      destination: true,
      manager: { select: { name: true, email: true } },
      trackers: {
        where: { status: "active" },
        select: {
          points: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              latitude: true,
              longitude: true,
              accuracy: true,
              speed: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const data: ActiveLocation[] = [];
  for (const s of shipments) {
    let latest: (typeof s.trackers)[number]["points"][number] | null = null;
    for (const t of s.trackers) {
      const p = t.points[0];
      if (!p) continue;
      if (!latest || p.createdAt > latest.createdAt) latest = p;
    }
    if (!latest) continue;
    data.push({
      shipmentId: s.id,
      title: s.title,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      manager: s.manager,
      latitude: latest.latitude,
      longitude: latest.longitude,
      accuracy: latest.accuracy,
      speed: latest.speed,
      capturedAt: latest.createdAt.toISOString(),
    });
  }

  return NextResponse.json({ data }, { status: 200 });
}
