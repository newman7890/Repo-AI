import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Props { onVerified?: () => void }

const RESEND_COOLDOWN = 60;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

/**
 * Email OTP verification using a one-time email sign-in code.
 * Sends a code to the signed-in user's account email and accepts the matching auth code type.
 */
const EmailVerify = ({ onVerified }: Props) => {
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setStage("sent");
      setCooldown(RESEND_COOLDOWN);
      toast({ title: "Code sent", description: `Check ${email} for the verification code.` });
    } catch (e: unknown) {
      toast({ title: "Failed to send", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }, [email, toast]);

  const verify = async () => {
    const cleaned = otp.replace(/\D/g, "");
    if (!cleaned.match(/^\d{6,8}$/)) {
      toast({ title: "Enter the code from your email", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const otpTypes = ["email", "magiclink", "recovery"] as const;
      let lastError: unknown;
      let verified = false;

      for (const type of otpTypes) {
        const { data, error } = await supabase.auth.verifyOtp({ email, token: cleaned, type });
        if (!error) {
          const verifiedEmail = data.user?.email?.toLowerCase();
          if (verifiedEmail && verifiedEmail !== email.toLowerCase()) {
            throw new Error("This code belongs to a different email address.");
          }
          verified = true;
          break;
        }
        lastError = error;
      }

      if (!verified) throw lastError;
      const { error: rpcErr } = await supabase.rpc("mark_email_verified");
      if (rpcErr) throw rpcErr;
      toast({ title: "Email verified ✓" });
      onVerified?.();
    } catch (e: unknown) {
      toast({ title: "Verification failed", description: getErrorMessage(e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (stage === "idle") {
    return (
      <div className="space-y-2">
        <Label>Account email</Label>
        <div className="flex gap-2">
          <Input value={email} readOnly className="bg-muted/40" />
          <Button onClick={sendCode} disabled={busy || !email}>{busy ? "…" : "Send code"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">We'll email a verification code to confirm it's you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="otp">Enter the code sent to {email}</Label>
      <div className="flex gap-2">
        <Input id="otp" inputMode="numeric" maxLength={12} placeholder="Enter email code" value={otp} onChange={(e) => setOtp(e.target.value)} />
        <Button onClick={verify} disabled={busy}>{busy ? "…" : "Verify"}</Button>
      </div>
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={sendCode}
          disabled={cooldown > 0 || busy}
          className="text-xs text-primary disabled:text-muted-foreground hover:underline disabled:no-underline disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : busy ? "Sending…" : "Resend code"}
        </button>
      </div>
    </div>
  );
};

export default EmailVerify;
