import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { AxelGuardLogo } from "@/components/ui/axelguard-logo";
import { LoadingTimeout } from "@/components/ui/LoadingTimeout";
import { toast } from "sonner";
import { z } from "zod";
import { hardResetAndReload } from "@/lib/authUtils";
import {
  AuthTimeoutError,
  isAuthNetworkError,
  validateAuthConfig,
  withTimeout,
} from "@/lib/authNetwork";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const LOGIN_TIMEOUT_MS = 20000;

type AuthStep = "credentials" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const { user, checkEmailAllowed, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // OTP state
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  // Store credentials temporarily for OTP flow
  const pendingCredentials = useRef<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (otpCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownRef.current);
    }
  }, [otpCountdown]);

  const sendOtp = async (targetEmail: string) => {
    setOtpSending(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: targetEmail },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to send OTP");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send OTP");
      }

      toast.success("OTP sent to your email!");
      setOtpCountdown(60);
      return true;
    } catch (err: any) {
      console.error("OTP send error:", err);
      setError("Failed to send OTP. Please try again.");
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const configValidation = validateAuthConfig();
    if (!configValidation.ok) {
      setError(configValidation.message);
      toast.error(configValidation.message);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    setSubmitting(true);

    try {
      const isAllowed = await checkEmailAllowed(normalizedEmail);

      if (!isAllowed) {
        setError("Access denied. Your email is not in the approved list. Please contact your administrator.");
        return;
      }

      if (isSignUp) {
        // Sign up flow - no OTP needed
        const { error: signUpError } = await withTimeout(
          supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          }),
          LOGIN_TIMEOUT_MS,
          "Sign up request timed out"
        );

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            setError("This email is already registered. Please sign in instead.");
          } else if (isAuthNetworkError(signUpError)) {
            setError("Network issue. Please check connection.");
          } else {
            setError(signUpError.message);
          }
          return;
        }

        toast.success("Account created successfully! Please check your email to verify your account.");
        setIsSignUp(false);
      } else {
        // Login flow - verify credentials first, then send OTP
        const { error: signInError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          }),
          LOGIN_TIMEOUT_MS,
          "Login request timed out"
        );

        if (signInError) {
          if (signInError.message.includes("Invalid login credentials")) {
            setError("Invalid email or password. Please try again.");
          } else if (signInError.message.includes("Email not confirmed")) {
            setError("Please verify your email address before signing in.");
          } else if (isAuthNetworkError(signInError)) {
            setError("Network issue. Please check connection.");
          } else {
            setError(signInError.message);
          }
          return;
        }

        // Credentials valid — sign out temporarily and proceed to OTP
        await supabase.auth.signOut({ scope: "local" });

        // Store credentials for after OTP verification
        pendingCredentials.current = { email: normalizedEmail, password };

        // Send OTP
        const sent = await sendOtp(normalizedEmail);
        if (sent) {
          setAuthStep("otp");
          setOtpValue("");
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err instanceof AuthTimeoutError) {
        setError("Network is slow or server is temporarily unreachable. Please try again.");
      } else if (isAuthNetworkError(err)) {
        setError("Network issue. Please check connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpValue.length !== 6 || submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const creds = pendingCredentials.current;
      if (!creds) {
        setError("Session expired. Please start over.");
        setAuthStep("credentials");
        return;
      }

      // Verify OTP via database function
      const { data: isValid, error: rpcError } = await supabase.rpc("verify_otp", {
        _email: creds.email,
        _otp: otpValue,
      });

      if (rpcError) {
        console.error("OTP verify error:", rpcError);
        setError("Failed to verify OTP. Please try again.");
        return;
      }

      if (!isValid) {
        setError("Invalid or expired OTP. Please try again.");
        setOtpValue("");
        return;
      }

      // OTP verified — now sign in for real
      const { error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.password,
        }),
        LOGIN_TIMEOUT_MS,
        "Login request timed out"
      );

      if (signInError) {
        setError(signInError.message);
        return;
      }

      pendingCredentials.current = null;
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("OTP verify error:", err);
      if (err instanceof AuthTimeoutError) {
        setError("Request timed out. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || !pendingCredentials.current) return;
    setError(null);
    await sendOtp(pendingCredentials.current.email);
    setOtpValue("");
  };

  const handleBackToCredentials = () => {
    setAuthStep("credentials");
    setOtpValue("");
    setError(null);
    pendingCredentials.current = null;
  };

  if (isLoading) {
    return (
      <LoadingTimeout isLoading={isLoading}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LoadingTimeout>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex items-center justify-center">
            <AxelGuardLogo size="xl" showText={false} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">AxelGuard</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {authStep === "otp"
                ? "Enter the verification code"
                : isSignUp
                ? "Create your account"
                : "Sign in to your account"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="animate-in fade-in-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {authStep === "otp" ? (
            /* ---- OTP STEP ---- */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to<br />
                  <span className="font-medium text-foreground">{pendingCredentials.current?.email}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={submitting}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-11 text-base font-medium"
                disabled={otpValue.length !== 6 || submitting}
                onClick={handleOtpVerify}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToCredentials}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || otpSending}
                  className="text-muted-foreground"
                >
                  {otpSending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {otpCountdown > 0
                    ? `Resend in ${otpCountdown}s`
                    : "Resend OTP"}
                </Button>
              </div>
            </div>
          ) : (
            /* ---- CREDENTIALS STEP ---- */
            <>
              <form onSubmit={handleCredentialSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    disabled={submitting}
                    className="h-11"
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      disabled={submitting}
                      className="h-11 pr-10"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={submitting || !email || !password}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSignUp ? "Creating account..." : "Verifying..."}
                    </>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {isSignUp ? "Already have an account?" : "New to AxelGuard?"}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setPassword("");
                }}
              >
                {isSignUp ? "Sign in instead" : "Create an account"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={hardResetAndReload}
              >
                Reset Session
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Only approved email addresses can access this system.
                <br />
                Contact your administrator for access.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
