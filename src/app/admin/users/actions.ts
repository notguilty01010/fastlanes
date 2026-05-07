"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const baseSchema = z.object({
  name: z.string().min(1, "Введите имя").max(120),
  email: z.string().email("Некорректный email").max(254),
  role: z.enum(["admin", "manager"]),
  isActive: z.boolean(),
});

const createSchema = baseSchema.extend({
  password: z.string().min(8, "Минимум 8 символов").max(200),
});

const updateSchema = baseSchema.extend({
  password: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => v === undefined || v.length >= 8, "Минимум 8 символов"),
});

export type UserFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "role" | "password" | "isActive", string>>;
};

function parseFormFlags(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "")
      .toLowerCase()
      .trim(),
    role: String(formData.get("role") ?? "manager") as Role,
    isActive: formData.get("isActive") === "on",
    password: formData.get("password") ? String(formData.get("password")) : "",
  };
}

function collectFieldErrors(error: z.ZodError): UserFormState["fieldErrors"] {
  const out: UserFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      key === "name" ||
      key === "email" ||
      key === "role" ||
      key === "password" ||
      key === "isActive"
    ) {
      out[key] = issue.message;
    }
  }
  return out;
}

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const raw = parseFormFlags(formData);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { fieldErrors: { email: "Пользователь с таким email уже есть" } };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserAction(
  id: string,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireAdmin();

  const raw = parseFormFlags(formData);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  // Защита: админ не должен случайно лишить себя роли или деактивировать себя.
  const isSelf = session.user.id === id;
  if (isSelf && parsed.data.role !== "admin") {
    return { fieldErrors: { role: "Нельзя снять админа с себя" } };
  }
  if (isSelf && !parsed.data.isActive) {
    return { fieldErrors: { isActive: "Нельзя деактивировать себя" } };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { fieldErrors: { email: "Пользователь с таким email уже есть" } };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (session.user.id === id) {
    // safety net — реально отключённая в UI кнопка для self
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/users");
}
