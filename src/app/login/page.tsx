import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Вхід — FastLanes",
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
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">FastLanes</div>
        <h1>Вхід</h1>
        <p className="muted">Введіть email та пароль для доступу до адмінки.</p>
        <LoginForm callbackUrl={params.callbackUrl} initialError={params.error} />
      </div>
    </main>
  );
}
