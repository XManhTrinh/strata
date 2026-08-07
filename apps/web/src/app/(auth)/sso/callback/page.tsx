"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function SSOCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const { checkSession } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    // With cookie-based auth, the backend sets cookies and redirects here.
    // Check session to confirm authentication and then redirect.
    checkSession().then(() => {
      const returnUrl = params.get("returnUrl") || "/";
      window.location.href = returnUrl;
    });
  }, [checkSession]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-6 p-8 text-center">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <h2 className="text-sm font-medium text-red-800 dark:text-red-300">
              SSO Authentication Failed
            </h2>
            <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
          <a
            href="/login"
            className="inline-block text-sm text-primary hover:underline"
          >
            Return to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4 p-8 text-center">
        <div className="animate-pulse">
          <p className="text-sm text-muted-foreground">Completing SSO sign-in...</p>
        </div>
      </div>
    </main>
  );
}
