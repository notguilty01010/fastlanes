import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  await requireAdmin();

  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: { manager: { select: { name: true, email: true } } },
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <h1>Грузы</h1>
        <Link href="/admin/shipments/new" className="btn">
          + Создать
        </Link>
      </div>

      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Маршрут</th>
            <th>Статус</th>
            <th>Менеджер</th>
            <th>Создан</th>
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
                <span className={`badge badge-status-${s.status}`}>{s.status}</span>
              </td>
              <td className="muted">{s.manager ? s.manager.name : "—"}</td>
              <td className="muted">{s.createdAt.toISOString().slice(0, 10)}</td>
              <td>
                <Link href={`/admin/shipments/${s.id}`} className="btn btn-secondary">
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
          {shipments.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                Грузов пока нет.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
