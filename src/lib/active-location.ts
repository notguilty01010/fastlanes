import type { ShipmentStatus } from "@prisma/client";

export type ShipmentLastPoint = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
};

export type ShipmentListItem = {
  shipmentId: string;
  title: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  manager: { name: string; email: string } | null;
  departureAt: string | null;
  arrivalAt: string | null;
  lastPoint: ShipmentLastPoint | null;
};

export type LocationHistoryPoint = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
};
