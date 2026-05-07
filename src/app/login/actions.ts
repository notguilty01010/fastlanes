"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/auth";

const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: LoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const callbackUrl =
    typeof formData.get("callbackUrl") === "string"
      ? (formData.get("callbackUrl") as string)
      : "/admin";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Неверный email или пароль" };
      }
      return { error: "Не удалось войти" };
    }
    throw err;
  }

  return {};
}
