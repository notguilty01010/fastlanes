import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/public-url";
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABEL } from "@/lib/shipment-status";
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

const TRACKER_STATUS_LABEL: Record<string, string> = {
  active: "активний",
  disabled: "вимкнений",
};

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

      <section className="panel">
        <h2>Швидка зміна статусу</h2>
        <div className="row-actions row-wrap">
          {SHIPMENT_STATUSES.map((s) => (
            <form key={s} action={setShipmentStatusAction}>
              <input type="hidden" name="id" value={shipment.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className={`btn ${shipment.status === s ? "" : "btn-secondary"}`}
                disabled={shipment.status === s}
              >
                {SHIPMENT_STATUS_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Трекінг-посилання</h2>
        <p className="muted">
          Дайте посилання або QR-код водієві - з нього він передає геолокацію. Вимкнене
          посилання припиняє приймати координати.
        </p>

        <form action={createTrackerAction} className="panel-action">
          <input type="hidden" name="shipmentId" value={shipment.id} />
          <button type="submit">+ Згенерувати посилання</button>
        </form>

        {trackerCards.length === 0 ? (
          <p className="muted">Посилань поки немає.</p>
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
                      aria-label="статус"
                    >
                      {TRACKER_STATUS_LABEL[tracker.status] ?? tracker.status}
                    </span>
                    <span className="muted">
                      {tracker._count.points} точок
                      {last
                        ? ` • остання ${last.createdAt.toISOString().slice(0, 16).replace("T", " ")}`
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
                          Вимкнути
                        </button>
                      </form>
                    ) : (
                      <form action={enableTrackerAction}>
                        <input type="hidden" name="id" value={tracker.id} />
                        <input type="hidden" name="shipmentId" value={shipment.id} />
                        <button type="submit" className="btn btn-secondary">
                          Увімкнути
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

      <section className="panel">
        <h2>Параметри вантажу</h2>
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
            departureAt: shipment.departureAt,
            arrivalAt: shipment.arrivalAt,
          }}
        />
      </section>

      <section className="panel panel-danger">
        <h2>Небезпечна зона</h2>
        <p className="muted">Видалення каскадно прибирає всі трекери та точки.</p>
        <form action={deleteShipmentAction}>
          <input type="hidden" name="id" value={shipment.id} />
          <button type="submit" className="btn btn-danger">
            Видалити вантаж
          </button>
        </form>
      </section>
    </>
  );
}
