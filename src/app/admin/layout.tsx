import Link from "next/link";

import { requireAdmin } from "@/lib/auth-helpers";
import { logoutAction } from "./actions";

export const metadata = {
  title: "Админка — FastLanes",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <>
      <nav className="admin-nav">
        <Link href="/admin">FastLanes admin</Link>
        <Link href="/admin/shipments">Грузы</Link>
        <Link href="/admin/map">Карта</Link>
        <Link href="/admin/users">Пользователи</Link>
        <span className="spacer">{session.user.email}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">
            Выйти
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </>
  );
}
