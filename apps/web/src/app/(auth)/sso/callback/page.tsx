"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingIndicator } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";

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
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container"
          aria-hidden="true"
        >
          <Icon name="shield" size={40} className="text-on-primary-container" filled />
        </div>
        <LoadingIndicator aria-label="Redirecting to sign-in" className="size-12" />
        <p className="text-body-medium text-on-surface-variant">Redirecting…</p>
      </div>
    </main>
  );
}
