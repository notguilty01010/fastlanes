import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SHIPMENT_STATUS_LABEL } from "@/lib/shipment-status";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  await requireAdmin();

  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: { manager: { select: { name: true, email: true } } },
  });

  return (
    <>
      <div className="page-header">
        <h1>Вантажі</h1>
        <Link href="/admin/shipments/new" className="btn">
          + Створити
        </Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Назва</th>
              <th>Маршрут</th>
              <th>Статус</th>
              <th>Менеджер</th>
              <th>Створено</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id}>
                <td data-label="Назва">
                  <Link href={`/admin/shipments/${s.id}`}>{s.title}</Link>
                </td>
                <td data-label="Маршрут" className="muted">
                  {s.origin} → {s.destination}
                </td>
                <td data-label="Статус">
                  <span className={`badge badge-status-${s.status}`}>
                    {SHIPMENT_STATUS_LABEL[s.status]}
                  </span>
                </td>
                <td data-label="Менеджер" className="muted">
                  {s.manager ? s.manager.name : "—"}
                </td>
                <td data-label="Створено" className="muted">
                  {s.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="td-actions">
                  <Link href={`/admin/shipments/${s.id}`} className="btn btn-secondary">
                    Відкрити
                  </Link>
                </td>
              </tr>
            ))}
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Вантажів поки немає.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
