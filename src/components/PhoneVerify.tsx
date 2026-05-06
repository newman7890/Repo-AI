import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Props { onVerified?: () => void }

/**
 * Phone OTP verification using Supabase built-in phone auth.
 * Requires admin to configure an SMS provider in Cloud → Auth.
 */
const PhoneVerify = ({ onVerified }: Props) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"input" | "verify">("input");
  const [busy, setBusy] = useState(false);

  // Normalize to E.164. Defaults to Ghana (+233) if a 10-digit local number starting with 0 is given.
  const toE164 = (raw: string): string | null => {
    let s = raw.replace(/[\s\-()]/g, "");
    if (s.startsWith("+")) {
      const digits = s.slice(1);
      if (!/^\d{8,15}$/.test(digits)) return null;
      return "+" + digits;
    }
    // Local Ghana format: 0XXXXXXXXX -> +233XXXXXXXXX
    if (/^0\d{9}$/.test(s)) return "+233" + s.slice(1);
    // Bare country-code digits
    if (/^\d{9,15}$/.test(s)) return "+" + s;
    return null;
  };

  const sendOtp = async () => {
    const e164 = toE164(phone);
    if (!e164) {
      toast({ title: "Invalid phone", description: "Use format +233241234567 or 0241234567", variant: "destructive" });
      return;
    }
    setPhone(e164);
    setBusy(true);
    try {
      // updateUser with phone triggers Supabase to send a verification SMS
      const { error } = await supabase.auth.updateUser({ phone: e164.replace(/^\+/, "") });
      if (error) throw error;
      setStage("verify");
      toast({ title: "Code sent", description: `OTP sent to ${e164}` });
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message || "SMS provider may not be configured", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    if (!otp.match(/^\d{4,8}$/)) {
      toast({ title: "Invalid code", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "phone_change" });
      if (error) throw error;

      // Mark profile verified
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ phone_number: phone, phone_verified: true }).eq("user_id", user.id);
      }
      toast({ title: "Phone verified ✓" });
      onVerified?.();
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (stage === "input") {
    return (
      <div className="space-y-2">
        <Label htmlFor="ph">Phone number</Label>
        <div className="flex gap-2">
          <Input id="ph" type="tel" placeholder="+233241234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button onClick={sendOtp} disabled={busy}>{busy ? "…" : "Send code"}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="otp">Enter the 6-digit code sent to {phone}</Label>
      <div className="flex gap-2">
        <Input id="otp" inputMode="numeric" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value)} />
        <Button onClick={verifyOtp} disabled={busy}>{busy ? "…" : "Verify"}</Button>
      </div>
      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setStage("input")}>
        Change number
      </button>
    </div>
  );
};

export default PhoneVerify;
