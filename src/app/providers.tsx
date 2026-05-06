"use client";

// Здесь позже подключатся: SessionProvider от Auth.js (этап 3),
// тема (если будет), QueryClientProvider и т.п. Пока — заглушка.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
