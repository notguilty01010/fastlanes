"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SHIPMENT_STATUSES } from "@/lib/shipment-status";

const baseSchema = z.object({
  title: z.string().min(1, "Введіть назву").max(200),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  origin: z.string().min(1, "Звідки").max(200),
  destination: z.string().min(1, "Куди").max(200),
  status: z.enum(SHIPMENT_STATUSES),
  managerId: z
    .string()
    .max(64)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ShipmentFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"title" | "description" | "origin" | "destination" | "status" | "managerId", string>
  >;
};

function parseForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    origin: String(formData.get("origin") ?? "").trim(),
    destination: String(formData.get("destination") ?? "").trim(),
    status: String(formData.get("status") ?? "created"),
    managerId: String(formData.get("managerId") ?? "").trim(),
  };
}

function collectFieldErrors(error: z.ZodError): ShipmentFormState["fieldErrors"] {
  const out: ShipmentFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      key === "title" ||
      key === "description" ||
      key === "origin" ||
      key === "destination" ||
      key === "status" ||
      key === "managerId"
    ) {
      out[key] = issue.message;
    }
  }
  return out;
}

export async function createShipmentAction(
  _prev: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  const session = await requireAdmin();

  const parsed = baseSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  const created = await prisma.shipment.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      status: parsed.data.status,
      managerId: parsed.data.managerId ?? session.user.id,
    },
  });

  revalidatePath("/admin/shipments");
  redirect(`/admin/shipments/${created.id}`);
}

export async function updateShipmentAction(
  id: string,
  _prev: ShipmentFormState,
  formData: FormData,
): Promise<ShipmentFormState> {
  await requireAdmin();

  const parsed = baseSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return { fieldErrors: collectFieldErrors(parsed.error) };
  }

  await prisma.shipment.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      status: parsed.data.status,
      managerId: parsed.data.managerId,
    },
  });

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
  return {};
}

export async function setShipmentStatusAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !SHIPMENT_STATUSES.includes(status as (typeof SHIPMENT_STATUSES)[number])) return;

  await prisma.shipment.update({
    where: { id },
    data: { status: status as (typeof SHIPMENT_STATUSES)[number] },
  });

  revalidatePath("/admin/shipments");
  revalidatePath(`/admin/shipments/${id}`);
}

export async function deleteShipmentAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.shipment.delete({ where: { id } });

  revalidatePath("/admin/shipments");
  redirect("/admin/shipments");
}
