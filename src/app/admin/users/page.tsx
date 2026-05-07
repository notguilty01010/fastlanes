import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toggleUserActiveAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
        <h1>Пользователи</h1>
        <Link href="/admin/users/new" className="btn">
          + Создать
        </Link>
      </div>

      <table>
        <thead>
          <tr>
            <th>Имя</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Создан</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === session.user.id;
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === "admin" ? "badge-admin" : ""}`}>
                    {u.role}
                  </span>
                </td>
                <td>
                  {u.isActive ? (
                    <span className="badge">активен</span>
                  ) : (
                    <span className="badge badge-inactive">отключён</span>
                  )}
                </td>
                <td className="muted">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td>
                  <div className="row-actions">
                    <Link href={`/admin/users/${u.id}`} className="btn btn-secondary">
                      Редактировать
                    </Link>
                    {!isSelf ? (
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="btn btn-secondary">
                          {u.isActive ? "Деактивировать" : "Активировать"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                Пользователей пока нет.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
