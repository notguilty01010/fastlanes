import Link from "next/link";

export default function AdminHome() {
  return (
    <>
      <h1>Адмінка</h1>
      <p className="muted">Керування вантажами, трекерами та користувачами.</p>

      <div className="admin-cards">
        <Link href="/admin/shipments" className="admin-card">
          <div className="admin-card-icon" aria-hidden>📦</div>
          <h3>Вантажі</h3>
          <p className="muted">Створення, статуси, трекінг-посилання</p>
        </Link>
        <Link href="/admin/map" className="admin-card">
          <div className="admin-card-icon" aria-hidden>🗺️</div>
          <h3>Карта</h3>
          <p className="muted">Поточне розташування активних вантажів</p>
        </Link>
        <Link href="/admin/users" className="admin-card">
          <div className="admin-card-icon" aria-hidden>👥</div>
          <h3>Користувачі</h3>
          <p className="muted">Менеджери та адміністратори</p>
        </Link>
      </div>
    </>
  );
}
