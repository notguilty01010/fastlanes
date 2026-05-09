import Link from "next/link";

import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="landing">
      <section className="landing-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="FastLanes" width={300} height={326} className="landing-logo" />
        <span className="landing-eyebrow">FastLanes</span>
        <h1>Логістичний трекер</h1>
        <p className="landing-lead">
          Створюйте вантажі, видавайте водіям трекінг-посилання та спостерігайте за переміщенням
          у реальному часі - без зайвих застосунків.
        </p>

        <div className="landing-actions">
          {session?.user ? (
            <>
              <Link href="/admin" className="btn btn-lg">
                Перейти в адмінку
              </Link>
              <span className="muted">
                Ви увійшли як <strong>{session.user.email}</strong> ({session.user.role})
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-lg">
                Увійти
              </Link>
              <a href="/api/health" className="btn btn-secondary btn-lg">
                Перевірка стану
              </a>
            </>
          )}
        </div>
      </section>

      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon" aria-hidden>📦</div>
          <h3>Вантажі</h3>
          <p className="muted">Заводьте маршрути, статуси й менеджерів - усе в одному місці.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon" aria-hidden>🔗</div>
          <h3>Трекінг-посилання</h3>
          <p className="muted">Згенеруйте посилання або QR-код - водій передає геолокацію зі смартфона.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon" aria-hidden>🗺️</div>
          <h3>Жива карта</h3>
          <p className="muted">Бачте всі активні вантажі на одній карті з оновленням кожні 15 секунд.</p>
        </div>
      </section>
    </main>
  );
}
