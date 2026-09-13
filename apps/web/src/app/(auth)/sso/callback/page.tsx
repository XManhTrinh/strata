"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy SSO callback page — redirects to the new auth callback route.
 * Kept for backwards compatibility in case old links are bookmarked.
 */
export default function SSOCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/callback" + window.location.search);
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <p className="text-sm text-surface-variant-foreground">Redirecting...</p>
    </main>
  );
}
