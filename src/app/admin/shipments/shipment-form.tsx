"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ShipmentStatus } from "@prisma/client";

import type { ShipmentFormState } from "./actions";

const initial: ShipmentFormState = {};

const STATUSES: ShipmentStatus[] = ["created", "waiting", "in_transit", "delivered", "cancelled"];

type Manager = { id: string; name: string; email: string };

type Props = {
  mode: "create" | "edit";
  action: (state: ShipmentFormState, formData: FormData) => Promise<ShipmentFormState>;
  managers: Manager[];
  defaultValues?: {
    title: string;
    description: string | null;
    origin: string;
    destination: string;
    status: ShipmentStatus;
    managerId: string | null;
  };
};

function SubmitButton({ mode }: { mode: Props["mode"] }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Сохраняем…" : mode === "create" ? "Создать" : "Сохранить"}
    </button>
  );
}

export function ShipmentForm({ mode, action, managers, defaultValues }: Props) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <label>
        Название
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultValues?.title ?? ""}
          aria-invalid={state.fieldErrors?.title ? true : undefined}
        />
        {state.fieldErrors?.title ? (
          <small className="error">{state.fieldErrors.title}</small>
        ) : null}
      </label>

      <label>
        Описание
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={defaultValues?.description ?? ""}
          aria-invalid={state.fieldErrors?.description ? true : undefined}
        />
        {state.fieldErrors?.description ? (
          <small className="error">{state.fieldErrors.description}</small>
        ) : null}
      </label>

      <label>
        Откуда
        <input
          name="origin"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultValues?.origin ?? ""}
          aria-invalid={state.fieldErrors?.origin ? true : undefined}
        />
        {state.fieldErrors?.origin ? (
          <small className="error">{state.fieldErrors.origin}</small>
        ) : null}
      </label>

      <label>
        Куда
        <input
          name="destination"
          type="text"
          required
          maxLength={200}
          defaultValue={defaultValues?.destination ?? ""}
          aria-invalid={state.fieldErrors?.destination ? true : undefined}
        />
        {state.fieldErrors?.destination ? (
          <small className="error">{state.fieldErrors.destination}</small>
        ) : null}
      </label>

      <label>
        Статус
        <select name="status" defaultValue={defaultValues?.status ?? "created"}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {state.fieldErrors?.status ? (
          <small className="error">{state.fieldErrors.status}</small>
        ) : null}
      </label>

      <label>
        Менеджер
        <select name="managerId" defaultValue={defaultValues?.managerId ?? ""}>
          <option value="">— не назначен —</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
        {state.fieldErrors?.managerId ? (
          <small className="error">{state.fieldErrors.managerId}</small>
        ) : null}
      </label>

      {state.error ? <p className="error">{state.error}</p> : null}

      <div className="row-actions">
        <SubmitButton mode={mode} />
        <Link href="/admin/shipments" className="btn btn-secondary">
          Отмена
        </Link>
      </div>
    </form>
  );
}
