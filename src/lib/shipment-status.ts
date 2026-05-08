import type { ShipmentStatus } from "@prisma/client";

export const SHIPMENT_STATUSES = [
  "created",
  "waiting",
  "in_transit",
  "delivered",
  "cancelled",
] as const satisfies readonly ShipmentStatus[];

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  created: "створено",
  waiting: "очікує",
  in_transit: "у дорозі",
  delivered: "доставлено",
  cancelled: "скасовано",
};

export const ACTIVE_SHIPMENT_STATUSES = [
  "created",
  "waiting",
  "in_transit",
] as const satisfies readonly ShipmentStatus[];
