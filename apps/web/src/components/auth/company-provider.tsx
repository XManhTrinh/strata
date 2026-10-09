"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CompanyContext } from "@/hooks/use-company";
import { createClient } from "@/lib/supabase/client";
import { apiClient } from "@/lib/api-client";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  supabaseUserId: string;
  companyId: string | null;
  companyName: string | null;
}

/**
 * Provides the current user's workspace context to all dashboard children.
 * Waits for a valid Supabase session before fetching /auth/me.
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        // Wait for a valid session before calling /auth/me
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();

        if (!data.session || cancelled) {
          setIsLoading(false);
          return;
        }

        const profile = await apiClient<UserProfile>("/auth/me");

        if (!cancelled) {
          setCompanyId(profile.companyId ?? "");
          setCompanyName(profile.companyName ?? "");
        }
      } catch {
        // Silently fail — pages will show empty state
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCompany();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <CompanyContext.Provider value={{ companyId, companyName, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}
