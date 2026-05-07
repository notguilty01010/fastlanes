import Link from "next/link";

import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main>
      <h1>FastLanes</h1>
      <p>Logistics tracker — MVP в разработке.</p>

      <p>
        Health: <a href="/api/health">/api/health</a>
      </p>

      {session?.user ? (
        <p>
          Вы вошли как <strong>{session.user.email}</strong> ({session.user.role}).{" "}
          <Link href="/admin">Админка</Link>
        </p>
      ) : (
        <p>
          <Link href="/login">Войти</Link>
        </p>
      )}
    </main>
  );
}
