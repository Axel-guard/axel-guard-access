import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, AlertCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { AxelGuardLogo } from "@/components/ui/axelguard-logo";
import { LoadingTimeout } from "@/components/ui/LoadingTimeout";
import { toast } from "sonner";
import { z } from "zod";
import { hardResetAndReload } from "@/lib/authUtils";
import {
  isAuthNetworkError,
  validateAuthConfig,
} from "@/lib/authNetwork";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const emailSchema = z.string().email("Please enter a valid email address");

type AuthStep = "email" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const { user, checkEmailAllowed, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [authStep, setAuthStep] = useState<AuthStep>("email");
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const verifiedEmail = useRef<string>("");

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const configValidation = validateAuthConfig();
    if (!configValidation.ok) {
      setError(configValidation.message);
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

      // Send OTP
      verifiedEmail.current = normalizedEmail;
      const sent = await sendOtp(normalizedEmail);
      if (sent) {
        setAuthStep("otp");
        setOtpValue("");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (isAuthNetworkError(err)) {
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
      const targetEmail = verifiedEmail.current;
      if (!targetEmail) {
        setError("Session expired. Please start over.");
        setAuthStep("email");
        return;
      }

      // Call verify-otp-login edge function which verifies OTP and returns a magic link token
      const { data, error: fnError } = await supabase.functions.invoke("verify-otp-login", {
        body: { email: targetEmail, otp: otpValue },
      });

      if (fnError) {
        setError("Failed to verify OTP. Please try again.");
        setOtpValue("");
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Invalid or expired OTP. Please try again.");
        setOtpValue("");
        return;
      }

      // Use the token_hash to complete sign-in via Supabase
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("Token verify error:", verifyError);
        setError("Login failed. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("OTP verify error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || !verifiedEmail.current) return;
    setError(null);
    await sendOtp(verifiedEmail.current);
    setOtpValue("");
  };

  const handleBackToEmail = () => {
    setAuthStep("email");
    setOtpValue("");
    setError(null);
    verifiedEmail.current = "";
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
                : "Sign in with your email"}
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
                  <span className="font-medium text-foreground">{verifiedEmail.current}</span>
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
                  onClick={handleBackToEmail}
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
            /* ---- EMAIL STEP ---- */
            <>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={submitting || !email}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>

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
