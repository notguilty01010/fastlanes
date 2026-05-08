"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Role } from "@prisma/client";

import type { UserFormState } from "./actions";

const initial: UserFormState = {};

type Props = {
  mode: "create" | "edit";
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
  defaultValues?: {
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
  };
  disableSelfDanger?: boolean;
};

function SubmitButton({ mode }: { mode: Props["mode"] }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Зберігаємо…" : mode === "create" ? "Створити" : "Зберегти"}
    </button>
  );
}

export function UserForm({ mode, action, defaultValues, disableSelfDanger }: Props) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="card-form">
      <label>
        Ім&apos;я
        <input
          name="name"
          type="text"
          required
          defaultValue={defaultValues?.name ?? ""}
          aria-invalid={state.fieldErrors?.name ? true : undefined}
        />
        {state.fieldErrors?.name ? <small className="error">{state.fieldErrors.name}</small> : null}
      </label>

      <label>
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email ?? ""}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
        />
        {state.fieldErrors?.email ? (
          <small className="error">{state.fieldErrors.email}</small>
        ) : null}
      </label>

      <label>
        Роль
        <select
          name="role"
          defaultValue={defaultValues?.role ?? "manager"}
          disabled={disableSelfDanger}
        >
          <option value="manager">менеджер</option>
          <option value="admin">адмін</option>
        </select>
        {state.fieldErrors?.role ? <small className="error">{state.fieldErrors.role}</small> : null}
        {disableSelfDanger ? (
          <small className="muted">Не можна змінювати роль у самого себе</small>
        ) : null}
      </label>

      <label>
        Пароль{" "}
        {mode === "edit" ? (
          <span className="muted">(залиште порожнім, якщо не змінюєте)</span>
        ) : null}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required={mode === "create"}
          minLength={mode === "create" ? 8 : undefined}
          aria-invalid={state.fieldErrors?.password ? true : undefined}
        />
        {state.fieldErrors?.password ? (
          <small className="error">{state.fieldErrors.password}</small>
        ) : null}
      </label>

      <label className="checkbox-label">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={defaultValues?.isActive ?? true}
          disabled={disableSelfDanger}
        />
        Активний
        {state.fieldErrors?.isActive ? (
          <small className="error">{state.fieldErrors.isActive}</small>
        ) : null}
      </label>

      {state.error ? <p className="error">{state.error}</p> : null}

      <div className="row-actions">
        <SubmitButton mode={mode} />
        <Link href="/admin/users" className="btn btn-secondary">
          Скасувати
        </Link>
      </div>
    </form>
  );
}
