"use client";

import { useState } from "react";
import Link from "next/link";

import { logoutAction } from "./actions";

export function AdminNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className={`admin-nav${open ? " is-open" : ""}`}>
      <Link href="/admin" className="admin-nav-brand" onClick={close}>
        FastLanes
      </Link>
      <button
        type="button"
        className="admin-nav-toggle"
        aria-label="Меню"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className="admin-nav-links">
        <Link href="/admin/shipments" onClick={close}>
          Вантажі
        </Link>
        <Link href="/admin/map" onClick={close}>
          Карта
        </Link>
        <Link href="/admin/users" onClick={close}>
          Користувачі
        </Link>
        <span className="spacer">{email}</span>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">
            Вийти
          </button>
        </form>
      </div>
    </nav>
  );
}
