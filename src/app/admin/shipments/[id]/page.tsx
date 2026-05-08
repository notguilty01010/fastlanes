import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/public-url";
import {
  deleteShipmentAction,
  setShipmentStatusAction,
  updateShipmentAction,
  type ShipmentFormState,
} from "../actions";
import { ShipmentForm } from "../shipment-form";
import {
  createTrackerAction,
  disableTrackerAction,
  enableTrackerAction,
} from "../trackers-actions";

const STATUSES = ["created", "waiting", "in_transit", "delivered", "cancelled"] as const;

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      trackers: {
        orderBy: { createdAt: "desc" },
        include: {
          points: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { points: true } },
        },
      },
    },
  });
  if (!shipment) notFound();

  const managers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const baseUrl = await getPublicUrl();

  const trackerCards = await Promise.all(
    shipment.trackers.map(async (t) => {
      const url = `${baseUrl}/track/${t.token}`;
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
      return { tracker: t, url, qrDataUrl };
    }),
  );

  const action = updateShipmentAction.bind(null, shipment.id) as (
    state: ShipmentFormState,
    formData: FormData,
  ) => Promise<ShipmentFormState>;

  return (
    <>
      <h1>{shipment.title}</h1>
      <p className="muted">
        {shipment.origin} → {shipment.destination}
      </p>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Быстрая смена статуса</h2>
        <div className="row-actions" style={{ flexWrap: "wrap" }}>
          {STATUSES.map((s) => (
            <form key={s} action={setShipmentStatusAction}>
              <input type="hidden" name="id" value={shipment.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className={`btn ${shipment.status === s ? "" : "btn-secondary"}`}
                disabled={shipment.status === s}
              >
                {s}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Трекинг-ссылки</h2>
        <p className="muted">
          Дай ссылку или QR-код водителю — с неё он передаёт геолокацию. Отключённая ссылка
          перестанет принимать координаты.
        </p>

        <form action={createTrackerAction} style={{ marginBottom: "1rem" }}>
          <input type="hidden" name="shipmentId" value={shipment.id} />
          <button type="submit">+ Сгенерировать ссылку</button>
        </form>

        {trackerCards.length === 0 ? (
          <p className="muted">Ссылок пока нет.</p>
        ) : (
          <div className="tracker-grid">
            {trackerCards.map(({ tracker, url, qrDataUrl }) => {
              const last = tracker.points[0];
              const isActive = tracker.status === "active";
              return (
                <div key={tracker.id} className="tracker-card">
                  <div className="tracker-card-head">
                    <span
                      className={`badge ${isActive ? "badge-admin" : "badge-inactive"}`}
                      aria-label="status"
                    >
                      {tracker.status}
                    </span>
                    <span className="muted">
                      {tracker._count.points} точек
                      {last
                        ? ` • последняя ${last.createdAt.toISOString().slice(0, 16).replace("T", " ")}`
                        : ""}
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt={`QR для ${url}`} className="tracker-qr" />
                  <a href={url} target="_blank" rel="noopener noreferrer" className="tracker-url">
                    {url}
                  </a>
                  <div className="row-actions">
                    {isActive ? (
                      <form action={disableTrackerAction}>
                        <input type="hidden" name="id" value={tracker.id} />
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button type="submit" className="btn btn-secondary">
                          Отключить
                        </button>
                      </form>
                    ) : (
                      <form action={enableTrackerAction}>
                        <input type="hidden" name="id" value={tracker.id} />
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button type="submit" className="btn btn-secondary">
                          Включить
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Параметры груза</h2>
        <ShipmentForm
          mode="edit"
          action={action}
          managers={managers}
          defaultValues={{
            title: shipment.title,
            description: shipment.description,
            origin: shipment.origin,
            destination: shipment.destination,
            status: shipment.status,
            managerId: shipment.managerId,
          }}
        />
      </section>

      <section>
        <h2>Опасная зона</h2>
        <form action={deleteShipmentAction}>
          <input type="hidden" name="id" value={shipment.id} />
          <button type="submit" className="btn btn-danger">
            Удалить груз
          </button>
        </form>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Удаление каскадно убирает все трекеры и точки.
        </p>
      </section>
    </>
  );
}
