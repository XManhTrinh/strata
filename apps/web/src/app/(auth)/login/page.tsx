"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button, TextField, Divider, Card } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Typography } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, loginWithGoogle, isLoading, error, isAuthenticated, checkSession } = useAuth();
  const router = useRouter();
  const checked = useRef(false);

  // Check session once on mount
  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      checkSession();
    }
    // eslint-disable-next-line
  }, []);

  // Redirect to dashboard once authenticated
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

  // Show skeleton only during initial session check, not during login attempt
  const showSkeleton = isLoading && !email && !password && !checked.current;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      {showSkeleton ? (
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon name="shield" size={40} className="text-primary" filled />
            </div>

            <div className="text-center space-y-1">
              <Typography variant="headline-small">
                Sign in to Strata
              </Typography>
              <Typography variant="body-large" color="surface-variant-foreground">
                Enter your credentials to continue
              </Typography>
            </div>

            <div className="w-full space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-error/10 px-4 py-3">
                    <Icon name="error" size={20} className="text-error shrink-0" />
                    <Typography variant="body-medium" color="error">{error}</Typography>
                  </div>
                )}

                <TextField
                  id="email"
                  type="email"
                  variant="outlined"
                  label="Email"
                  className="w-full"
                  value={email}
                  onChange={(value) => { setEmail(value); if (emailError) validateEmail(value); }}
                  onBlur={() => validateEmail(email)}
                  placeholder="you@company.com"
                  invalid={!!emailError}
                  errorMessage={emailError}
                  autoComplete="email"
                  leadingIcon={<Icon name="mail" size={20} />}
                  aria-invalid={!!emailError}
                />

                <TextField
                  id="password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  label="Password"
                  className="w-full"
                  value={password}
                  onChange={(value) => { setPassword(value); if (passwordError) validatePassword(value); }}
                  onBlur={() => validatePassword(password)}
                  placeholder="••••••••"
                  invalid={!!passwordError}
                  errorMessage={passwordError}
                  autoComplete="current-password"
                  leadingIcon={<Icon name="lock" size={20} />}
                  trailingIcon={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-surface-variant-foreground hover:text-surface-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                      <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                    </button>
                  }
                  aria-invalid={!!passwordError}
                />

                <Button type="submit" variant="filled" disabled={isLoading} className="w-full">
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              <div className="relative flex items-center gap-4">
                <Divider className="flex-1" />
                <Typography variant="label-small" as="span" color="surface-variant-foreground" className="uppercase">Or continue with</Typography>
                <Divider className="flex-1" />
              </div>

              <Button type="button" variant="tonal" className="w-full" leadingIcon={<Icon name="public" size={20} />} onClick={() => loginWithGoogle("/dashboard")}>
                Sign in with Google
              </Button>

              <Typography variant="body-medium" color="surface-variant-foreground" className="text-center">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">Create one</Link>
              </Typography>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
