"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Client-side auth guard.
 *
 * The middleware already handles server-side redirects, so this component
 * is a safety net for client-side navigation where the session might
 * expire between page transitions.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const router = useRouter();
  const initialized = useRef(false);

  // Check session once on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      checkSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect if not authenticated after session check completes
  useEffect(() => {
    if (initialized.current && !isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
