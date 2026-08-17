"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@vkieu/mui/buttons";
import { TextField } from "@vkieu/mui";
import { Divider } from "@vkieu/mui";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showSSO, setShowSSO] = useState(false);
  const [ssoOrgId, setSsoOrgId] = useState("");

  const { login, loginWithGoogle, isLoading, error, isAuthenticated, checkSession } = useAuth();
  const router = useRouter();

  // Check if already authenticated on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${API_URL}/auth/sso/${ssoOrgId.trim()}/login?returnUrl=${encodeURIComponent("/")}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      {/* Loading skeleton while checking session */}
      {isLoading && !email && !password ? (
        <Card variant="elevated" className="w-full max-w-100">
          <CardContent className="flex flex-col items-center gap-6 py-10">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="w-full space-y-4 pt-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="elevated" className="w-full max-w-100">
          <CardContent className="flex flex-col items-center gap-6 py-8 px-6">
            {/* Brand logo */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon name="shield" size={40} className="text-primary" filled />
            </div>

            {/* Title & description */}
            <div className="text-center space-y-1">
              <h1 className="text-[24px] font-normal leading-8 text-surface-foreground">
                Sign in to Strata
              </h1>
              <p className="text-[16px] leading-6 tracking-[0.5px] text-surface-variant-foreground">
                Enter your credentials to continue
              </p>
            </div>

            {!showSSO ? (
              <div className="w-full space-y-5">
                {/* Credential form */}
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div className="flex items-center gap-2 rounded-[12px] bg-error/10 px-4 py-3">
                      <Icon name="error" size={20} className="text-error shrink-0" />
                      <p className="text-[14px] leading-5 text-error">{error}</p>
                    </div>
                  )}

                  <TextField
                    id="email"
                    type="email"
                    variant="outlined"
                    label="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    placeholder="you@company.com"
                    error={!!emailError}
                    errorText={emailError}
                    autoComplete="email"
                    leadingIcon={<Icon name="mail" size={20} />}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />

                  <TextField
                    id="password"
                    type="password"
                    variant="outlined"
                    label="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    placeholder="••••••••"
                    error={!!passwordError}
                    errorText={passwordError}
                    autoComplete="current-password"
                    leadingIcon={<Icon name="lock" size={20} />}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "password-error" : undefined}
                  />

                  <Button
                    type="submit"
                    variant="filled"
                    disabled={isLoading}
                    loading={isLoading}
                    size="l"
                    className="w-full"
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative flex items-center gap-4">
                  <Divider className="flex-1" />
                  <span className="text-[12px] leading-4 tracking-[0.5px] text-surface-variant-foreground uppercase">
                    Or continue with
                  </span>
                  <Divider className="flex-1" />
                </div>

                {/* Social / SSO buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="tonal"
                    size="l"
                    className="w-full"
                    icon={<Icon name="public" size={20} />}
                    onClick={() => loginWithGoogle("/")}
                  >
                    Sign in with Google
                  </Button>

                  <Button
                    type="button"
                    variant="outlined"
                    size="l"
                    className="w-full"
                    icon={<Icon name="domain" size={20} />}
                    onClick={() => setShowSSO(true)}
                  >
                    Sign in with SSO
                  </Button>
                </div>

                {/* Dev login */}
                <div className="pt-2">
                  <Divider className="mb-4" />
                  <Button
                    type="button"
                    variant="text"
                    size="s"
                    className="w-full text-warning"
                    icon={<Icon name="rocket_launch" size={20} />}
                    onClick={handleDevLogin}
                    disabled={isLoading}
                  >
                    Dev Login (skip auth)
                  </Button>
                  <p className="mt-1 text-[11px] text-center text-surface-variant-foreground">
                    Development only — calls /auth/dev-login endpoint
                  </p>
                </div>
              </div>
            ) : (
              /* SSO org input form */
              <form onSubmit={handleSSOLogin} className="w-full space-y-4" noValidate>
                <TextField
                  id="sso-org"
                  type="text"
                  variant="outlined"
                  label="Organization ID"
                  value={ssoOrgId}
                  onChange={(e) => setSsoOrgId(e.target.value)}
                  placeholder="Enter your organization ID"
                  leadingIcon={<Icon name="corporate_fare" size={20} />}
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="filled"
                  disabled={!ssoOrgId.trim()}
                  size="l"
                  className="w-full"
                >
                  Continue with SSO
                </Button>

                <Button
                  type="button"
                  variant="text"
                  size="s"
                  className="w-full"
                  icon={<Icon name="arrow_back" size={20} />}
                  onClick={() => setShowSSO(false)}
                >
                  Back to email login
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
