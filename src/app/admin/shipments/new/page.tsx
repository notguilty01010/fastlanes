import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createShipmentAction } from "../actions";
import { ShipmentForm } from "../shipment-form";

export default async function NewShipmentPage() {
  await requireAdmin();

  const managers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="page-narrow">
      <h1>Новий вантаж</h1>
      <ShipmentForm mode="create" action={createShipmentAction} managers={managers} />
    </div>
  );
}
