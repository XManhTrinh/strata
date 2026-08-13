"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@vkieu/mui/buttons";
import { TextField } from "@vkieu/mui";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Divider } from "@vkieu/mui";

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
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card variant="elevated" className="w-full max-w-100">
        <CardContent className="flex flex-col items-center gap-6 py-8 px-6">
          {/* Brand icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon name="domain" size={40} className="text-primary" filled />
          </div>

          {/* Title & description */}
          <div className="text-center space-y-1">
            <h1 className="text-[24px] font-normal leading-8 text-surface-foreground">
              Enterprise SSO
            </h1>
            <p className="text-[16px] leading-6 tracking-[0.5px] text-surface-variant-foreground">
              Enter your organization ID to continue with Single Sign-On
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
            {error && (
              <div className="flex items-center gap-2 rounded-[12px] bg-error/10 px-4 py-3">
                <Icon name="error" size={20} className="text-error shrink-0" />
                <p className="text-[14px] leading-5 text-error">{error}</p>
              </div>
            )}

            <TextField
              id="org-id"
              type="text"
              variant="outlined"
              label="Organization ID"
              value={organizationId}
              onChange={(e) => {
                setOrganizationId(e.target.value);
                if (error) setError("");
              }}
              placeholder="your-organization-id"
              error={!!error}
              errorText={error}
              leadingIcon={<Icon name="corporate_fare" size={20} />}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "org-error" : undefined}
            />

            <Button
              type="submit"
              variant="filled"
              size="l"
              className="w-full"
            >
              Continue with SSO
            </Button>

            <Divider className="my-2" />

            <Button
              type="button"
              variant="text"
              size="s"
              className="w-full"
              icon={<Icon name="arrow_back" size={20} />}
              onClick={() => window.location.href = "/login"}
            >
              Back to email login
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
