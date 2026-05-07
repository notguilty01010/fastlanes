"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginState } from "./actions";

const initial: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Входим…" : "Войти"}
    </button>
  );
}

export function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl?: string;
  initialError?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initial);

  const error =
    state.error ?? (initialError === "CredentialsSignin" ? "Неверный email или пароль" : undefined);

  return (
    <form action={formAction} className="login-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/admin"} />

      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
        />
        {state.fieldErrors?.email ? (
          <small className="error">{state.fieldErrors.email}</small>
        ) : null}
      </label>

      <label>
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
        />
        {state.fieldErrors?.password ? (
          <small className="error">{state.fieldErrors.password}</small>
        ) : null}
      </label>

      {error ? <p className="error">{error}</p> : null}

      <SubmitButton />
    </form>
  );
}
