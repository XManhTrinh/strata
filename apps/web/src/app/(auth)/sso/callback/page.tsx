"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Icon } from "@strata/mui";
import { Button } from "@strata/mui/buttons";
import { Card, CardContent } from "@strata/mui";
import { CircularProgress } from "@strata/mui/indicators";

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

    checkSession().then(() => {
      const returnUrl = params.get("returnUrl") || "/";
      window.location.href = returnUrl;
    });
  }, [checkSession]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-4">
        <Card variant="elevated" className="w-full max-w-100">
          <CardContent className="flex flex-col items-center gap-4 py-10 px-6 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h1 className="text-[22px] leading-7 font-normal text-surface-foreground">
              Authentication Failed
            </h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground max-w-xs">
              {error}
            </p>
            <Button variant="text" asChild className="mt-2">
              <a href="/login">
                <Icon name="arrow_back" size={18} />
                Return to login
              </a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <CircularProgress aria-label="Signing in" />
        <div>
          <p className="text-[16px] leading-6 text-surface-foreground font-medium">
            Completing sign-in
          </p>
          <p className="text-[14px] leading-5 text-surface-variant-foreground mt-1">
            Please wait while we verify your credentials...
          </p>
        </div>
      </div>
    </main>
  );
}
