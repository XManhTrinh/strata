"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@vkieu/mui/buttons";
import { TextField, Divider, Icon, Card, CardContent, Typography } from "@vkieu/mui";

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
        <Card variant="elevated" className="w-full max-w-100">
          <CardContent className="flex flex-col items-center gap-6 py-10 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon name="mark_email_read" size={40} className="text-primary" />
            </div>
            <div className="space-y-2">
              <Typography variant="headline-small">
                Check your email
              </Typography>
              <Typography variant="body-medium" color="surface-variant-foreground" className="max-w-xs">
                We sent a confirmation link to <strong>{email}</strong>. Click the link to
                activate your account.
              </Typography>
            </div>
            <Link href="/login" className="text-[14px] font-medium text-primary hover:text-primary/80 transition-colors">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card variant="elevated" className="w-full max-w-100">
        <CardContent className="flex flex-col items-center gap-6 py-8 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon name="shield" size={40} className="text-primary" filled />
          </div>

          <div className="text-center space-y-1">
            <Typography variant="headline-small">
              Create your account
            </Typography>
            <Typography variant="body-large" color="surface-variant-foreground">
              Get started with Strata for free
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
                id="fullName" type="text" variant="outlined" label="Full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (nameError) validateName(e.target.value); }}
                onBlur={() => validateName(fullName)}
                placeholder="Jane Smith"
                error={!!nameError} errorText={nameError}
                autoComplete="name"
                leadingIcon={<Icon name="person" size={20} />}
                aria-invalid={!!nameError}
              />

              <TextField
                id="companyName" type="text" variant="outlined" label="Workspace name"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); if (companyError) validateCompany(e.target.value); }}
                onBlur={() => validateCompany(companyName)}
                placeholder="My team or Acme Inc."
                error={!!companyError} errorText={companyError}
                autoComplete="organization"
                leadingIcon={<Icon name="apartment" size={20} />}
                aria-invalid={!!companyError}
              />

              <TextField
                id="email" type="email" variant="outlined" label="Email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
                onBlur={() => validateEmail(email)}
                placeholder="you@company.com"
                error={!!emailError} errorText={emailError}
                autoComplete="email"
                leadingIcon={<Icon name="mail" size={20} />}
                aria-invalid={!!emailError}
              />

              <TextField
                id="password" type={showPassword ? "text" : "password"} variant="outlined" label="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value); }}
                onBlur={() => validatePassword(password)}
                placeholder="Min. 8 characters"
                error={!!passwordError} errorText={passwordError}
                autoComplete="new-password"
                leadingIcon={<Icon name="lock" size={20} />}
                trailingIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-surface-variant-foreground hover:text-surface-foreground transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                }
                aria-invalid={!!passwordError}
              />

              <TextField
                id="confirmPassword" type={showConfirmPassword ? "text" : "password"} variant="outlined" label="Confirm password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (confirmError) validateConfirmPassword(e.target.value); }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                placeholder="Re-enter your password"
                error={!!confirmError} errorText={confirmError}
                autoComplete="new-password"
                leadingIcon={<Icon name="lock" size={20} />}
                trailingIcon={
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1 text-surface-variant-foreground hover:text-surface-foreground transition-colors" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                    <Icon name={showConfirmPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                }
                aria-invalid={!!confirmError}
              />

              <Button type="submit" variant="filled" disabled={isSubmitting} loading={isSubmitting} className="w-full">
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="relative flex items-center gap-4">
              <Divider className="flex-1" />
              <Typography variant="label-small" as="span" color="surface-variant-foreground" className="uppercase">Or continue with</Typography>
              <Divider className="flex-1" />
            </div>

            <Button type="button" variant="tonal" className="w-full" icon={<Icon name="public" size={20} />} onClick={() => loginWithGoogle("/dashboard")}>
              Sign up with Google
            </Button>

            <Typography variant="body-medium" color="surface-variant-foreground" className="text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">Sign in</Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
