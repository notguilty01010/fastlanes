"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function createTrackerAction(formData: FormData) {
  await requireAdmin();

  const shipmentId = String(formData.get("shipmentId") ?? "");
  if (!shipmentId) return;

  // 24 символа nanoid - URL-safe и без `=`.
  const token = nanoid(24);

  await prisma.tracker.create({
    data: {
      shipmentId,
      token,
      status: "active",
    },
  });

  revalidatePath(`/admin/shipments/${shipmentId}`);
}

export async function disableTrackerAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const shipmentId = String(formData.get("shipmentId") ?? "");
  if (!id) return;

  await prisma.tracker.update({
    where: { id },
    data: { status: "disabled" },
  });

  if (shipmentId) revalidatePath(`/admin/shipments/${shipmentId}`);
}

export async function enableTrackerAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const shipmentId = String(formData.get("shipmentId") ?? "");
  if (!id) return;

  await prisma.tracker.update({
    where: { id },
    data: { status: "active" },
  });

  if (shipmentId) revalidatePath(`/admin/shipments/${shipmentId}`);
}
