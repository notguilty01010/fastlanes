"use client";

import Link from "next/link";
import type { ShipmentStatus } from "@prisma/client";

import type { LocationHistoryPoint, ShipmentListItem } from "@/lib/active-location";
import { SHIPMENT_STATUSES, SHIPMENT_STATUS_LABEL } from "@/lib/shipment-status";

type HistoryState = "idle" | "loading" | "ok" | "error";

type Props = {
  shipments: ShipmentListItem[];
  statusFilter: Set<ShipmentStatus>;
  onToggleStatus: (status: ShipmentStatus) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  history: LocationHistoryPoint[];
  historyState: HistoryState;
  onRetryHistory: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function ShipmentsSidebar({
  shipments,
  statusFilter,
  onToggleStatus,
  selectedId,
  onSelect,
  history,
  historyState,
  onRetryHistory,
}: Props) {
  return (
    <aside className="map-sidebar">
      <div className="map-sidebar-section">
        <h3 className="map-sidebar-title">Фільтр статусів</h3>
        <div className="map-status-filter">
          {SHIPMENT_STATUSES.map((s) => {
            const checked = statusFilter.has(s);
            return (
              <label
                key={s}
                className={`map-status-chip badge badge-status-${s}${checked ? " is-on" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleStatus(s)}
                />
                {SHIPMENT_STATUS_LABEL[s]}
              </label>
            );
          })}
        </div>
      </div>

      <div className="map-sidebar-section">
        <h3 className="map-sidebar-title">
          Вантажі <span className="muted">({shipments.length})</span>
        </h3>
        {shipments.length === 0 ? (
          <p className="muted">Немає вантажів за поточним фільтром.</p>
        ) : (
          <ul className="map-shipment-list">
            {shipments.map((s) => {
              const isSelected = s.shipmentId === selectedId;
              const hasPoint = s.lastPoint !== null;
              return (
                <li
                  key={s.shipmentId}
                  className={`map-shipment-card${isSelected ? " is-selected" : ""}`}
                >
                  <div className="map-shipment-head">
                    <strong>{s.title}</strong>
                    <span className={`badge badge-status-${s.status}`}>
                      {SHIPMENT_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <div className="map-shipment-route muted">
                    {s.origin} → {s.destination}
                  </div>
                  <div className="map-shipment-meta">
                    <span>
                      <span className="muted">Відпр.:</span> {formatDate(s.departureAt)}
                    </span>
                    <span>
                      <span className="muted">Прибуття:</span> {formatDate(s.arrivalAt)}
                    </span>
                  </div>
                  {s.lastPoint ? (
                    <div className="map-shipment-meta muted">
                      Остання точка: {formatDateTime(s.lastPoint.capturedAt)}
                    </div>
                  ) : (
                    <div className="map-shipment-meta muted">Немає координат</div>
                  )}
                  <div className="row-actions row-wrap">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onSelect(s.shipmentId)}
                      disabled={!hasPoint}
                      title={hasPoint ? undefined : "Немає координат"}
                    >
                      Показати на карті
                    </button>
                    <Link
                      href={`/admin/shipments/${s.shipmentId}`}
                      className="btn btn-secondary"
                    >
                      Редагувати
                    </Link>
                  </div>
                  {isSelected ? (
                    <HistoryBlock
                      history={history}
                      historyState={historyState}
                      onRetry={onRetryHistory}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function HistoryBlock({
  history,
  historyState,
  onRetry,
}: {
  history: LocationHistoryPoint[];
  historyState: HistoryState;
  onRetry: () => void;
}) {
  return (
    <div className="map-history">
      <div className="map-history-head">
        <strong>Історія переміщення</strong>
        <span className="muted">{history.length} точок</span>
      </div>
      {historyState === "loading" && history.length === 0 ? (
        <p className="muted">Завантажуємо…</p>
      ) : null}
      {historyState === "error" ? (
        <div>
          <p className="error">Не вдалося завантажити історію.</p>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Спробувати ще раз
          </button>
        </div>
      ) : null}
      {historyState === "ok" && history.length === 0 ? (
        <p className="muted">Точок ще немає.</p>
      ) : null}
      {history.length > 0 ? (
        <div className="map-history-table-wrap">
          <table className="map-history-table">
            <thead>
              <tr>
                <th>Час</th>
                <th>Координати</th>
                <th>Точність</th>
                <th>Швидкість</th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.capturedAt)}</td>
                  <td>
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </td>
                  <td>{p.accuracy !== null ? `${p.accuracy.toFixed(0)} м` : "—"}</td>
                  <td>{p.speed !== null ? `${p.speed.toFixed(1)} м/с` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
