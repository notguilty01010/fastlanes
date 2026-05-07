import Link from "next/link";

export default function AdminHome() {
  return (
    <>
      <h1>Админка</h1>
      <p className="muted">Управление аккаунтами. Грузы и трекеры — в следующих этапах.</p>

      <ul>
        <li>
          <Link href="/admin/users">Пользователи</Link>
        </li>
      </ul>
    </>
  );
}
