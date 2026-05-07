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
      {pending ? "Сохраняем…" : mode === "create" ? "Создать" : "Сохранить"}
    </button>
  );
}

export function UserForm({ mode, action, defaultValues, disableSelfDanger }: Props) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <label>
        Имя
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
          <option value="manager">manager</option>
          <option value="admin">admin</option>
        </select>
        {state.fieldErrors?.role ? <small className="error">{state.fieldErrors.role}</small> : null}
        {disableSelfDanger ? (
          <small className="muted">Нельзя менять роль у самого себя</small>
        ) : null}
      </label>

      <label>
        Пароль{" "}
        {mode === "edit" ? <span className="muted">(оставь пустым, если не меняешь)</span> : null}
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

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={defaultValues?.isActive ?? true}
          disabled={disableSelfDanger}
          style={{ width: "auto" }}
        />
        Активен
        {state.fieldErrors?.isActive ? (
          <small className="error">{state.fieldErrors.isActive}</small>
        ) : null}
      </label>

      {state.error ? <p className="error">{state.error}</p> : null}

      <div className="row-actions">
        <SubmitButton mode={mode} />
        <Link href="/admin/users" className="btn btn-secondary">
          Отмена
        </Link>
      </div>
    </form>
  );
}
