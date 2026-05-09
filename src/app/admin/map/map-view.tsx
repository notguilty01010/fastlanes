"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type { LocationHistoryPoint, ShipmentListItem } from "@/lib/active-location";
import { SHIPMENT_STATUS_LABEL } from "@/lib/shipment-status";

const truckIcon = L.divIcon({
  className: "fl-marker",
  html: `<div class="fl-marker-pin"><span>🚚</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const truckIconSelected = L.divIcon({
  className: "fl-marker",
  html: `<div class="fl-marker-pin fl-marker-pin-selected"><span>🚚</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

type Props = {
  shipments: ShipmentListItem[];
  selectedId: string | null;
  history: LocationHistoryPoint[];
  focusToken: number;
};

function FocusController({
  shipments,
  selectedId,
  history,
  focusToken,
}: {
  shipments: ShipmentListItem[];
  selectedId: string | null;
  history: LocationHistoryPoint[];
  focusToken: number;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);
  const lastFocusToken = useRef(focusToken);

  // Initial fit-bounds across all visible markers (once).
  useEffect(() => {
    if (initialFitDone.current) return;
    const positions = shipments
      .filter((s) => s.lastPoint)
      .map((s) => [s.lastPoint!.latitude, s.lastPoint!.longitude] as [number, number]);
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 12 });
    initialFitDone.current = true;
  }, [map, shipments]);

  // Focus on selected shipment whenever the user clicks "Show on map".
  useEffect(() => {
    if (focusToken === lastFocusToken.current) return;
    lastFocusToken.current = focusToken;
    if (!selectedId) return;

    if (history.length >= 2) {
      const bounds = L.latLngBounds(
        history.map((p) => [p.latitude, p.longitude] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      return;
    }

    const pointPosition =
      history.length === 1
        ? ([history[0].latitude, history[0].longitude] as [number, number])
        : (() => {
            const ship = shipments.find((s) => s.shipmentId === selectedId);
            if (!ship?.lastPoint) return null;
            return [ship.lastPoint.latitude, ship.lastPoint.longitude] as [number, number];
          })();
    if (pointPosition) {
      map.setView(pointPosition, 13);
    }
  }, [map, focusToken, selectedId, history, shipments]);

  return null;
}

export function MapView({ shipments, selectedId, history, focusToken }: Props) {
  const center = useMemo<[number, number]>(() => {
    const first = shipments.find((s) => s.lastPoint);
    if (!first?.lastPoint) return [50.45, 30.52]; // Київ — fallback
    return [first.lastPoint.latitude, first.lastPoint.longitude];
  }, [shipments]);

  const polylinePositions = useMemo<[number, number][]>(() => {
    if (!selectedId || history.length < 2) return [];
    return history.map((p) => [p.latitude, p.longitude]);
  }, [selectedId, history]);

  return (
    <MapContainer
      center={center}
      zoom={6}
      scrollWheelZoom
      style={{ height: "calc(100vh - 180px)", width: "100%", borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FocusController
        shipments={shipments}
        selectedId={selectedId}
        history={history}
        focusToken={focusToken}
      />
      {polylinePositions.length >= 2 ? (
        <Polyline
          positions={polylinePositions}
          pathOptions={{ color: "#8b5cf6", weight: 4, opacity: 0.85 }}
        />
      ) : null}
      {shipments
        .filter((s) => s.lastPoint)
        .map((s) => {
          const p = s.lastPoint!;
          const isSelected = s.shipmentId === selectedId;
          return (
            <Marker
              key={s.shipmentId}
              position={[p.latitude, p.longitude]}
              icon={isSelected ? truckIconSelected : truckIcon}
            >
              <Popup>
                <strong>{s.title}</strong>
                <br />
                <span>
                  {s.origin} → {s.destination}
                </span>
                <br />
                <span>статус: {SHIPMENT_STATUS_LABEL[s.status]}</span>
                <br />
                <span>
                  координати: {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                </span>
                <br />
                <span>точка: {new Date(p.capturedAt).toLocaleString()}</span>
                {s.manager ? (
                  <>
                    <br />
                    <span>менеджер: {s.manager.name}</span>
                  </>
                ) : null}
                {isSelected && history.length > 0 ? (
                  <>
                    <br />
                    <span>точок історії: {history.length}</span>
                  </>
                ) : null}
                <br />
                <a href={`/admin/shipments/${s.shipmentId}`}>Відкрити вантаж →</a>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
