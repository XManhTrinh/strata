"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button, TextField, Divider, Card, IconButton } from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";
// Standalone route (outside the dashboard shell) — read the reduced-motion
// preference from the underlying hook directly, not the shell context.
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, loginWithGoogle, isLoading, error, isAuthenticated, checkSession } = useAuth();
  const router = useRouter();
  const checked = useRef(false);
  const reduced = useReducedMotion();
  const cardVariants = resolveAnimationVariants(pageTransitionVariants, reduced);

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
        <motion.div
          className="w-full max-w-100"
          variants={cardVariants}
          initial="initial"
          animate="enter"
          transition={defaultTransition}
        >
          <Card variant="elevated" className="w-full">
            <CardContent className="flex flex-col items-center gap-6 py-10">
              <SkeletonGroup label="Loading sign-in form">
                <Skeleton className="h-12 w-12" corner="full" />
                <Skeleton className="h-6 w-48" corner="extra-small" />
                <Skeleton className="h-4 w-64" corner="extra-small" />
                <div className="w-full space-y-4 pt-4">
                  <Skeleton className="h-14 w-full" corner="extra-small" />
                  <Skeleton className="h-14 w-full" corner="extra-small" />
                  <Skeleton className="h-12 w-full" corner="full" />
                </div>
              </SkeletonGroup>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-100"
          variants={cardVariants}
          initial="initial"
          animate="enter"
          transition={defaultTransition}
        >
          <Card variant="elevated" className="w-full">
            <CardContent className="flex flex-col items-center gap-6 py-8 px-6">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container"
                aria-hidden="true"
              >
                <Icon name="shield" size={40} className="text-on-primary-container" filled />
              </div>

              <div className="text-center space-y-1">
                <h1 className="font-brand text-headline-small">Sign in to Strata</h1>
                <p className="text-body-large text-on-surface-variant">
                  Enter your credentials to continue
                </p>
              </div>

              <div className="w-full space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3"
                    >
                      <Icon
                        name="error"
                        size={20}
                        className="text-on-error-container shrink-0"
                      />
                      <p className="text-body-medium text-on-error-container">{error}</p>
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
                      <IconButton
                        type="button"
                        variant="standard"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        icon={<Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />}
                      />
                    }
                    aria-invalid={!!passwordError}
                  />

                  <Button type="submit" variant="filled" disabled={isLoading} className="w-full">
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <div className="relative flex items-center gap-4">
                  <Divider className="flex-1" />
                  <span className="text-label-small text-on-surface-variant uppercase">Or continue with</span>
                  <Divider className="flex-1" />
                </div>

                <Button type="button" variant="tonal" className="w-full" leadingIcon={<Icon name="public" size={20} />} onClick={() => loginWithGoogle("/dashboard")}>
                  Sign in with Google
                </Button>

                <p className="text-body-medium text-on-surface-variant text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">Create one</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </main>
  );
}
