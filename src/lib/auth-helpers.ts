import { redirect } from "next/navigation";

import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }
  return session;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
