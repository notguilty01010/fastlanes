import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  created: "створено",
  waiting: "очікує",
  in_transit: "у дорозі",
  delivered: "доставлено",
  cancelled: "скасовано",
};

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
                <td>
                  <Link href={`/admin/shipments/${s.id}`}>{s.title}</Link>
                </td>
                <td className="muted">
                  {s.origin} → {s.destination}
                </td>
                <td>
                  <span className={`badge badge-status-${s.status}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </td>
                <td className="muted">{s.manager ? s.manager.name : "—"}</td>
                <td className="muted">{s.createdAt.toISOString().slice(0, 10)}</td>
                <td>
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
