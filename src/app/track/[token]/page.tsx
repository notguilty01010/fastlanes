import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { TrackClient } from "./track-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Передача геолокації — FastLanes",
};

const STATUS_LABEL: Record<string, string> = {
  created: "створено",
  waiting: "очікує",
  in_transit: "у дорозі",
  delivered: "доставлено",
  cancelled: "скасовано",
};

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length > 64) notFound();

  const tracker = await prisma.tracker.findUnique({
    where: { token },
    include: {
      shipment: {
        select: { title: true, destination: true, origin: true, status: true },
      },
    },
  });

  if (!tracker) notFound();

  const isExpired = tracker.expiresAt ? tracker.expiresAt.getTime() < Date.now() : false;
  const isDisabled = tracker.status !== "active" || isExpired;

  return (
    <div className="track-page">
      <header className="track-header">
        <span className="track-brand">FastLanes</span>
        <h1>{tracker.shipment.title}</h1>
        <p className="muted">
          {tracker.shipment.origin} → <strong>{tracker.shipment.destination}</strong>
        </p>
        <p className="muted">статус: {STATUS_LABEL[tracker.shipment.status] ?? tracker.shipment.status}</p>
      </header>

      {isDisabled ? (
        <div className="track-disabled">
          <h2>Посилання вимкнене</h2>
          <p className="muted">
            Це трекінг-посилання більше не активне. Зв&apos;яжіться з менеджером, щоб отримати нове.
          </p>
        </div>
      ) : (
        <TrackClient token={token} />
      )}
    </div>
  );
}
