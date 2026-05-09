"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ShipmentStatus } from "@prisma/client";

import type { LocationHistoryPoint, ShipmentListItem } from "@/lib/active-location";
import { ACTIVE_SHIPMENT_STATUSES, SHIPMENT_STATUSES } from "@/lib/shipment-status";

import { ShipmentsSidebar } from "./shipments-sidebar";

const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <p className="muted">Завантажуємо карту…</p>,
});

const POLL_INTERVAL_MS = 15_000;

type FetchState = "idle" | "loading" | "ok" | "error";
type HistoryState = "idle" | "loading" | "ok" | "error";

async function loadShipments(statuses: ShipmentStatus[]): Promise<ShipmentListItem[]> {
  const params = new URLSearchParams();
  if (statuses.length > 0 && statuses.length < SHIPMENT_STATUSES.length) {
    params.set("statuses", statuses.join(","));
  }
  const qs = params.toString();
  const res = await fetch(`/api/shipments/with-locations${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data: ShipmentListItem[] };
  return json.data;
}

async function loadHistory(shipmentId: string): Promise<LocationHistoryPoint[]> {
  const res = await fetch(`/api/shipments/${shipmentId}/history`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data: LocationHistoryPoint[] };
  return json.data;
}

export function MapClient() {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<ShipmentStatus>>(
    () => new Set(ACTIVE_SHIPMENT_STATUSES),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<LocationHistoryPoint[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>("idle");
  const [focusToken, setFocusToken] = useState(0);

  const filterKey = useMemo(
    () => SHIPMENT_STATUSES.filter((s) => statusFilter.has(s)).join(","),
    [statusFilter],
  );

  const activeStatuses = useMemo<ShipmentStatus[]>(
    () => SHIPMENT_STATUSES.filter((s) => statusFilter.has(s)),
    [statusFilter],
  );

  const filterRef = useRef(activeStatuses);
  filterRef.current = activeStatuses;

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        setState((prev) => (prev === "ok" ? prev : "loading"));
        const data = await loadShipments(filterRef.current);
        if (cancelled) return;
        setShipments(data);
        setUpdatedAt(Date.now());
        setState("ok");
      } catch {
        if (cancelled) return;
        setState("error");
      }
    };

    tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [filterKey]);

  const toggleStatus = useCallback((status: ShipmentStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const fetchHistory = useCallback(async (shipmentId: string) => {
    setHistoryState("loading");
    try {
      const data = await loadHistory(shipmentId);
      setHistory(data);
      setHistoryState("ok");
    } catch {
      setHistory([]);
      setHistoryState("error");
    }
  }, []);

  const selectShipment = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFocusToken((n) => n + 1);
      void fetchHistory(id);
    },
    [fetchHistory],
  );

  const retryHistory = useCallback(() => {
    if (!selectedId) return;
    void fetchHistory(selectedId);
  }, [selectedId, fetchHistory]);

  const withPoint = shipments.filter((s) => s.lastPoint !== null).length;

  return (
    <>
      <div className="map-toolbar">
        <span className="muted">
          {state === "loading" && "Завантажуємо вантажі…"}
          {state === "ok" &&
            `${shipments.length} вантажів (${withPoint} з координатами)${
              updatedAt ? ` · оновлено ${new Date(updatedAt).toLocaleTimeString()}` : ""
            }`}
          {state === "error" && "Не вдалося отримати дані - спробуємо знову через 15 секунд"}
        </span>
      </div>
      <div className="map-layout">
        <ShipmentsSidebar
          shipments={shipments}
          statusFilter={statusFilter}
          onToggleStatus={toggleStatus}
          selectedId={selectedId}
          onSelect={selectShipment}
          history={history}
          historyState={historyState}
          onRetryHistory={retryHistory}
        />
        <div className="map-layout-map">
          <MapView
            shipments={shipments}
            selectedId={selectedId}
            history={history}
            focusToken={focusToken}
          />
        </div>
      </div>
    </>
  );
}
