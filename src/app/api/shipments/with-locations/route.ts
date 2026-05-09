import { NextResponse } from "next/server";
import type { ShipmentStatus } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ShipmentListItem } from "@/lib/active-location";
import { SHIPMENT_STATUSES } from "@/lib/shipment-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseStatuses(raw: string | null): ShipmentStatus[] | null {
  if (!raw) return null;
  const requested = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (requested.length === 0) return null;
  const allowed = new Set<string>(SHIPMENT_STATUSES);
  const filtered = requested.filter((s) => allowed.has(s)) as ShipmentStatus[];
  return filtered.length > 0 ? filtered : [];
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const statuses = parseStatuses(url.searchParams.get("statuses"));

  // null → без фильтра; [] → все запрошенные значения невалидны → пустой список.
  if (statuses !== null && statuses.length === 0) {
    return NextResponse.json({ data: [] satisfies ShipmentListItem[] }, { status: 200 });
  }

  const shipments = await prisma.shipment.findMany({
    where: statuses ? { status: { in: statuses } } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      origin: true,
      destination: true,
      departureAt: true,
      arrivalAt: true,
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

  const data: ShipmentListItem[] = shipments.map((s) => {
    let latest: (typeof s.trackers)[number]["points"][number] | null = null;
    for (const t of s.trackers) {
      const p = t.points[0];
      if (!p) continue;
      if (!latest || p.createdAt > latest.createdAt) latest = p;
    }
    return {
      shipmentId: s.id,
      title: s.title,
      status: s.status,
      origin: s.origin,
      destination: s.destination,
      manager: s.manager,
      departureAt: s.departureAt ? s.departureAt.toISOString() : null,
      arrivalAt: s.arrivalAt ? s.arrivalAt.toISOString() : null,
      lastPoint: latest
        ? {
            latitude: latest.latitude,
            longitude: latest.longitude,
            accuracy: latest.accuracy,
            speed: latest.speed,
            capturedAt: latest.createdAt.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({ data }, { status: 200 });
}
