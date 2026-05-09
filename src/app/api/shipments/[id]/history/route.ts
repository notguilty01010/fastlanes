import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { LocationHistoryPoint } from "@/lib/active-location";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HISTORY_POINT_LIMIT = 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!shipment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const points = await prisma.locationPoint.findMany({
    where: { tracker: { shipmentId: id } },
    orderBy: { createdAt: "asc" },
    take: HISTORY_POINT_LIMIT,
    select: {
      id: true,
      latitude: true,
      longitude: true,
      accuracy: true,
      speed: true,
      createdAt: true,
    },
  });

  const data: LocationHistoryPoint[] = points.map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    accuracy: p.accuracy,
    speed: p.speed,
    capturedAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ data }, { status: 200 });
}
