import Link from "next/link";

export default function AdminHome() {
  return (
    <>
      <h1>Админка</h1>
      <p className="muted">Управление грузами, трекерами и пользователями.</p>

      <ul>
        <li>
          <Link href="/admin/shipments">Грузы</Link> — создание, статусы, трекинг-ссылки
        </li>
        <li>
          <Link href="/admin/map">Карта</Link> — текущее положение активных грузов
        </li>
        <li>
          <Link href="/admin/users">Пользователи</Link> — менеджеры и админы
        </li>
      </ul>
    </>
  );
}
