"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SSOLoginPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!organizationId.trim()) {
      setError("Organization ID is required");
      return;
    }

    setError("");
    // Redirect to the backend SSO initiation endpoint
    const returnUrl = typeof window !== "undefined" ? window.location.pathname : "/";
    window.location.href = `${API_URL}/auth/sso/${organizationId.trim()}/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in with SSO</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your organization ID to continue with Single Sign-On.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="org-id" className="text-sm font-medium text-foreground">
              Organization ID
            </label>
            <input
              id="org-id"
              type="text"
              value={organizationId}
              onChange={(e) => {
                setOrganizationId(e.target.value);
                if (error) setError("");
              }}
              placeholder="your-organization-id"
              className="h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "org-error" : undefined}
            />
            {error && (
              <p id="org-error" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full">
            Continue with SSO
          </Button>

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to email login
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
