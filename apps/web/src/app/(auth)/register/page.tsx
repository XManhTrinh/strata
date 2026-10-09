"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Button, TextField, Divider, Card, IconButton } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";
// Standalone route (outside the dashboard shell) — read the reduced-motion
// preference from the underlying hook directly, not the shell context.
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { loginWithGoogle, isAuthenticated, checkSession } = useAuth();
  const router = useRouter();
  const checked = useRef(false);
  const reduced = useReducedMotion();
  const cardVariants = resolveAnimationVariants(pageTransitionVariants, reduced);

  useEffect(() => {
    if (!checked.current) {
      checked.current = true;
      checkSession();
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) { setNameError("Full name is required"); return false; }
    if (value.trim().length < 2) { setNameError("Name must be at least 2 characters"); return false; }
    setNameError(""); return true;
  };

  const validateCompany = (value: string): boolean => {
    if (!value.trim()) { setCompanyError("Workspace name is required"); return false; }
    if (value.trim().length < 2) { setCompanyError("Workspace name must be at least 2 characters"); return false; }
    setCompanyError(""); return true;
  };

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) { setEmailError("Email is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setEmailError("Enter a valid email address"); return false; }
    setEmailError(""); return true;
  };

  const validatePassword = (value: string): boolean => {
    if (!value) { setPasswordError("Password is required"); return false; }
    if (value.length < 8) { setPasswordError("Password must be at least 8 characters"); return false; }
    setPasswordError(""); return true;
  };

  const validateConfirmPassword = (value: string): boolean => {
    if (!value) { setConfirmError("Please confirm your password"); return false; }
    if (value !== password) { setConfirmError("Passwords do not match"); return false; }
    setConfirmError(""); return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameValid = validateName(fullName);
    const companyValid = validateCompany(companyName);
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);
    const confirmValid = validateConfirmPassword(confirmPassword);

    if (!nameValid || !companyValid || !emailValid || !passwordValid || !confirmValid) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-4">
        <motion.div
          className="w-full max-w-100"
          variants={cardVariants}
          initial="initial"
          animate="enter"
          transition={defaultTransition}
        >
          <Card variant="elevated" className="w-full">
            <CardContent className="flex flex-col items-center gap-6 py-10 px-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container"
                aria-hidden="true"
              >
                <Icon name="mark_email_read" size={40} className="text-on-primary-container" />
              </div>
              <div className="space-y-2">
                <h1 className="font-brand text-headline-small">Check your email</h1>
                <p className="text-body-medium text-on-surface-variant max-w-xs">
                  We sent a confirmation link to <strong>{email}</strong>. Click the link to
                  activate your account.
                </p>
              </div>
              <Link
                href="/login"
                className="text-label-large font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
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
              <h1 className="font-brand text-headline-small">Create your account</h1>
              <p className="text-body-large text-on-surface-variant">
                Get started with Strata for free
              </p>
            </div>

            <div className="w-full space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl bg-error-container px-4 py-3"
                  >
                    <Icon name="error" size={20} className="text-on-error-container shrink-0" />
                    <p className="text-body-medium text-on-error-container">{error}</p>
                  </div>
                )}

                <TextField
                  id="fullName" type="text" variant="outlined" label="Full name"
                  className="w-full"
                  value={fullName}
                  onChange={(value) => { setFullName(value); if (nameError) validateName(value); }}
                  onBlur={() => validateName(fullName)}
                  placeholder="Jane Smith"
                  invalid={!!nameError} errorMessage={nameError}
                  autoComplete="name"
                  leadingIcon={<Icon name="person" size={20} />}
                  aria-invalid={!!nameError}
                />

                <TextField
                  id="companyName" type="text" variant="outlined" label="Workspace name"
                  className="w-full"
                  value={companyName}
                  onChange={(value) => { setCompanyName(value); if (companyError) validateCompany(value); }}
                  onBlur={() => validateCompany(companyName)}
                  placeholder="My team or Acme Inc."
                  invalid={!!companyError} errorMessage={companyError}
                  autoComplete="organization"
                  leadingIcon={<Icon name="apartment" size={20} />}
                  aria-invalid={!!companyError}
                />

                <TextField
                  id="email" type="email" variant="outlined" label="Email"
                  className="w-full"
                  value={email}
                  onChange={(value) => { setEmail(value); if (emailError) validateEmail(value); }}
                  onBlur={() => validateEmail(email)}
                  placeholder="you@company.com"
                  invalid={!!emailError} errorMessage={emailError}
                  autoComplete="email"
                  leadingIcon={<Icon name="mail" size={20} />}
                  aria-invalid={!!emailError}
                />

                <TextField
                  id="password" type={showPassword ? "text" : "password"} variant="outlined" label="Password"
                  className="w-full"
                  value={password}
                  onChange={(value) => { setPassword(value); if (passwordError) validatePassword(value); }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Min. 8 characters"
                  invalid={!!passwordError} errorMessage={passwordError}
                  autoComplete="new-password"
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

                <TextField
                  id="confirmPassword" type={showConfirmPassword ? "text" : "password"} variant="outlined" label="Confirm password"
                  className="w-full"
                  value={confirmPassword}
                  onChange={(value) => { setConfirmPassword(value); if (confirmError) validateConfirmPassword(value); }}
                  onBlur={() => validateConfirmPassword(confirmPassword)}
                  placeholder="Re-enter your password"
                  invalid={!!confirmError} errorMessage={confirmError}
                  autoComplete="new-password"
                  leadingIcon={<Icon name="lock" size={20} />}
                  trailingIcon={
                    <IconButton
                      type="button"
                      variant="standard"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      icon={<Icon name={showConfirmPassword ? "visibility_off" : "visibility"} size={20} />}
                    />
                  }
                  aria-invalid={!!confirmError}
                />

                <Button type="submit" variant="filled" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <div className="relative flex items-center gap-4">
                <Divider className="flex-1" />
                <span className="text-label-small text-on-surface-variant uppercase">Or continue with</span>
                <Divider className="flex-1" />
              </div>

              <Button type="button" variant="tonal" className="w-full" leadingIcon={<Icon name="public" size={20} />} onClick={() => loginWithGoogle("/dashboard")}>
                Sign up with Google
              </Button>

              <p className="text-body-medium text-on-surface-variant text-center">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
