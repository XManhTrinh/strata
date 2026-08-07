"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

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
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="you@company.com"
                  className={`h-10 w-full rounded-sm border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    emailError ? "border-red-500" : "border-border"
                  }`}
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
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="••••••••"
                  className={`h-10 w-full rounded-sm border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                    passwordError ? "border-red-500" : "border-border"
                  }`}
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

              <button
                type="submit"
                disabled={isLoading}
                className="h-10 w-full rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loginWithGoogle("/")}
              className="h-10 w-full rounded-sm border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={() => setShowSSO(true)}
              className="h-10 w-full rounded-sm border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Sign in with SSO
            </button>
          </>
        ) : (
          <form onSubmit={handleSSOLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sso-org" className="text-sm font-medium text-foreground">
                Organization ID
              </label>
              <input
                id="sso-org"
                type="text"
                value={ssoOrgId}
                onChange={(e) => setSsoOrgId(e.target.value)}
                placeholder="Enter your organization ID"
                className="h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!ssoOrgId.trim()}
              className="h-10 w-full rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Continue with SSO
            </button>

            <button
              type="button"
              onClick={() => setShowSSO(false)}
              className="h-10 w-full rounded-sm border border-border bg-background text-sm font-medium text-foreground hover:bg-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Back to email login
            </button>
          </form>
        )}

        {/* Dev login */}
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleDevLogin}
            disabled={isLoading}
            className="h-10 w-full rounded-sm border border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Dev Login (skip auth)
          </button>
          <p className="mt-1.5 text-[10px] text-center text-muted-foreground">
            Development only — calls /auth/dev-login endpoint
          </p>
        </div>
      </div>
    </main>
  );
}
