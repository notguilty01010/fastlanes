import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Вход — FastLanes",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl ?? "/admin");
  }

  return (
    <main>
      <h1>Вход</h1>
      <LoginForm callbackUrl={params.callbackUrl} initialError={params.error} />
    </main>
  );
}
