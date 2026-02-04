import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, KeyRound, LogIn, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

type AuthStep = "email" | "otp";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateEmail = (): boolean => {
    setError(null);
    try {
      emailSchema.parse(email);
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
      }
      return false;
    }
  };

  const handleSendOTP = async () => {
    if (!validateEmail()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: email.trim(), action: "send" },
      });

      if (fnError) {
        setError(fnError.message || "Failed to send OTP");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setSuccess("OTP sent to your email. Please check your inbox.");
      setStep("otp");
      setResendCooldown(30);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: email.trim(), action: "verify", otp },
      });

      if (fnError) {
        setError(fnError.message || "Failed to verify OTP");
        return;
      }

      if (data?.error) {
        setError(data.error);
        setOtp("");
        return;
      }

      if (data?.token && data?.type) {
        // Verify the token to sign in
        const { error: signInError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.token,
          type: "magiclink",
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          setError("Failed to complete sign in. Please try again.");
          return;
        }

        setSuccess("Login successful! Redirecting...");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    await handleSendOTP();
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setError(null);
    setSuccess(null);
  };

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !submitting) {
      if (step === "email") {
        handleSendOTP();
      } else if (step === "otp" && otp.length === 6) {
        handleVerifyOTP();
      }
    }
  }, [step, otp, submitting]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">AxelGuard</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {step === "email" 
                ? "Enter your email to receive a login code" 
                : "Enter the 6-digit code sent to your email"
              }
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent onKeyPress={handleKeyPress}>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 animate-in fade-in-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {step === "email" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                      disabled={submitting}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendOTP}
                  className="w-full h-11 gap-2 font-medium"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Send OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    One-Time Password
                  </Label>
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <KeyRound className="absolute -left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hidden sm:block" />
                    </div>
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
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
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Sent to <span className="font-medium">{email}</span>
                  </p>
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  className="w-full h-11 gap-2 font-medium"
                  disabled={submitting || otp.length !== 6}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Verify & Sign In
                </Button>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToEmail}
                    disabled={submitting}
                    className="text-muted-foreground"
                  >
                    ← Change email
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={submitting || resendCooldown > 0}
                    className="gap-1 text-muted-foreground"
                  >
                    <RefreshCw className={`h-3 w-3 ${submitting ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <p className="text-xs text-center text-muted-foreground/70">
            Only pre-approved email addresses can access this system.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
