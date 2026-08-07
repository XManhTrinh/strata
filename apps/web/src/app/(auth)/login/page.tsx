"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showSSO, setShowSSO] = useState(false);
  const [ssoOrgId, setSsoOrgId] = useState("");

  const { login, loginWithGoogle, devLogin, isLoading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);

    if (!emailValid || !passwordValid) return;

    await login(email, password);
  };

  const handleSSOLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!ssoOrgId.trim()) return;
    // SSO org-based login still redirects to backend SSO endpoint
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${API_URL}/auth/sso/${ssoOrgId.trim()}/login?returnUrl=${encodeURIComponent("/")}`;
  };

  const handleDevLogin = async () => {
    await devLogin();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to Strata</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the platform.
          </p>
        </div>

        {!showSSO ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="you@company.com"
                  className={emailError ? "border-red-500" : ""}
                  autoComplete="email"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && (
                  <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="••••••••"
                  className={passwordError ? "border-red-500" : ""}
                  autoComplete="current-password"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                {passwordError && (
                  <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
                    {passwordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => loginWithGoogle("/")}
            >
              Sign in with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowSSO(true)}
            >
              Sign in with SSO
            </Button>
          </>
        ) : (
          <form onSubmit={handleSSOLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sso-org">Organization ID</Label>
              <Input
                id="sso-org"
                type="text"
                value={ssoOrgId}
                onChange={(e) => setSsoOrgId(e.target.value)}
                placeholder="Enter your organization ID"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={!ssoOrgId.trim()}
              size="lg"
              className="w-full"
            >
              Continue with SSO
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setShowSSO(false)}
            >
              Back to email login
            </Button>
          </form>
        )}

        {/* Dev login */}
        <div className="pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50"
            onClick={handleDevLogin}
            disabled={isLoading}
          >
            🚀 Dev Login (skip auth)
          </Button>
          <p className="mt-1.5 text-[10px] text-center text-muted-foreground">
            Development only — calls /auth/dev-login endpoint
          </p>
        </div>
      </div>
    </main>
  );
}
