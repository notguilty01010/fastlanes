"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type { ActiveLocation } from "@/lib/active-location";
import { SHIPMENT_STATUS_LABEL } from "@/lib/shipment-status";

// Default Leaflet icon ссылается на ассеты из CDN/`./images/` — при сборке Next ломается.
// Делаем свою маленькую иконку через divIcon, без растровых ассетов.
const truckIcon = L.divIcon({
  className: "fl-marker",
  html: `<div class="fl-marker-pin"><span>🚚</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

function FitBounds({ points }: { points: ActiveLocation[] }) {
  const map = useMap();
  const fitOnce = useRef(false);

  useEffect(() => {
    if (fitOnce.current) return;
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    fitOnce.current = true;
  }, [map, points]);

  return null;
}

export function MapView({ points }: { points: ActiveLocation[] }) {
  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return [50.45, 30.52]; // Київ — fallback
    return [points[0].latitude, points[0].longitude];
  }, [points]);

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
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.shipmentId} position={[p.latitude, p.longitude]} icon={truckIcon}>
          <Popup>
            <strong>{p.title}</strong>
            <br />
            <span>
              {p.origin} → {p.destination}
            </span>
            <br />
            <span>статус: {SHIPMENT_STATUS_LABEL[p.status]}</span>
            <br />
            <span>
              координати: {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
            </span>
            <br />
            <span>
              точка: {new Date(p.capturedAt).toLocaleString()}
            </span>
            {p.manager ? (
              <>
                <br />
                <span>менеджер: {p.manager.name}</span>
              </>
            ) : null}
            <br />
            <a href={`/admin/shipments/${p.shipmentId}`}>Відкрити вантаж →</a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
