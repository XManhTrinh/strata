import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-surface-container-low flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
