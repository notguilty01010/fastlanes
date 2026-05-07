"use client";

import { SessionProvider } from "next-auth/react";

// Здесь позже подключатся: тема, QueryClientProvider и т.п.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
