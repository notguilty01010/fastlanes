import type { ShipmentStatus } from "@prisma/client";

export type ActiveLocation = {
  shipmentId: string;
  title: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  manager: { name: string; email: string } | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  capturedAt: string;
};
