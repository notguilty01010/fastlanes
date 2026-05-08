"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import type { ActiveLocation } from "@/app/api/shipments/active-locations/route";

const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <p className="muted">Загружаем карту…</p>,
});

const POLL_INTERVAL_MS = 15_000;

type FetchState = "idle" | "loading" | "ok" | "error";

async function loadActive(): Promise<ActiveLocation[]> {
  const res = await fetch("/api/shipments/active-locations", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data: ActiveLocation[] };
  return json.data;
}

export function MapClient() {
  const [points, setPoints] = useState<ActiveLocation[]>([]);
  const [state, setState] = useState<FetchState>("loading");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await loadActive();
        if (cancelled) return;
        setPoints(data);
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
  }, []);

  return (
    <>
      <div className="map-toolbar">
        <span className="muted">
          {state === "loading" && "Загружаем активные грузы…"}
          {state === "ok" &&
            `${points.length} активных груз(а/ов) с координатами${
              updatedAt ? ` · обновлено ${new Date(updatedAt).toLocaleTimeString()}` : ""
            }`}
          {state === "error" && "Не удалось получить данные — повторим через 15 секунд"}
        </span>
      </div>
      <MapView points={points} />
    </>
  );
}
