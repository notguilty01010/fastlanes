import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toggleUserActiveAction } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "адмін",
  manager: "менеджер",
};

export default async function UsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-header">
        <h1>Користувачі</h1>
        <Link href="/admin/users/new" className="btn">
          + Створити
        </Link>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ім&apos;я</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Створено</th>
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
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td>
                    {u.isActive ? (
                      <span className="badge">активний</span>
                    ) : (
                      <span className="badge badge-inactive">вимкнений</span>
                    )}
                  </td>
                  <td className="muted">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/users/${u.id}`} className="btn btn-secondary">
                        Редагувати
                      </Link>
                      {!isSelf ? (
                        <form action={toggleUserActiveAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="btn btn-secondary">
                            {u.isActive ? "Деактивувати" : "Активувати"}
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
                  Користувачів поки немає.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
