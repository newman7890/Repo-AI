import { useState, useEffect, useRef, useCallback } from "react";
import { Crown, Zap, Shield, Sparkles, Loader2, CreditCard, Smartphone, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAuthHeaders } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMethod = "card" | "mobile_money";
type MoMoStep = "input" | "otp" | "pending" | "success" | "failed";

const PROVIDERS = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "vod", label: "Vodafone Cash" },
  { value: "tgo", label: "AirtelTigo Money" },
];

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("mtn");
  const [momoStep, setMomoStep] = useState<MoMoStep>("input");
  const [reference, setReference] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [otp, setOtp] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopPolling();
      setMomoStep("input");
      setReference("");
      setStatusMessage("");
      setOtp("");
      setLoading(false);
    }
  }, [open, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollPaymentStatus = useCallback(async (ref: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 min at 5s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        setMomoStep("failed");
        setStatusMessage("Payment timed out. Please try again.");
        return;
      }

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ reference: ref }),
          }
        );
        const data = await res.json();

        if (data.payment_status === "success") {
          stopPolling();
          setMomoStep("success");
          setStatusMessage("Payment confirmed! Your premium tokens are ready.");
        } else if (data.payment_status === "failed" || data.payment_status === "abandoned") {
          stopPolling();
          setMomoStep("failed");
          setStatusMessage(data.message || "Payment failed. Please try again.");
        }
        // else keep polling (pending)
      } catch {
        // Network error, keep polling
      }
    }, 5000);
  }, [stopPolling]);

  const handleMoMoPay = async () => {
    if (!phone.trim()) {
      toast({ title: "Enter phone number", description: "Please enter your mobile money number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/momo-charge`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ phone: phone.trim(), provider }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to initiate payment");

      setReference(data.reference);

      if (data.status === "send_otp") {
        // Paystack requires OTP before sending USSD push
        setStatusMessage(data.display_text || "Enter the OTP sent to your phone to authorize the payment.");
        setMomoStep("otp");
      } else {
        // Direct USSD push (pay_offline or pending)
        setStatusMessage(data.display_text || "A prompt has been sent to your phone. Enter your PIN to complete payment.");
        setMomoStep("pending");
        pollPaymentStatus(data.reference);
      }
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = async () => {
    if (!otp.trim()) {
      toast({ title: "Enter OTP", description: "Please enter the OTP sent to your phone.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-otp`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ otp: otp.trim(), reference }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "OTP submission failed");

      setStatusMessage(data.display_text || "Payment is being processed...");
      setMomoStep("pending");
      pollPaymentStatus(data.reference);
    } catch (err: any) {
      toast({ title: "OTP error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ payment_method: "card" }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to start checkout");
      window.location.href = data.authorization_url;
    } catch (err: any) {
      toast({ title: "Payment error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onOpenChange(false);
    // Trigger page reload to refresh credits
    window.location.search = "?payment=success";
  };

  return (
    <Dialog open={open} onOpenChange={momoStep === "pending" ? undefined : onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">Upgrade to Premium</DialogTitle>
          <DialogDescription className="text-sm">
            {momoStep === "pending"
              ? "Complete payment on your phone"
              : momoStep === "success"
              ? "You're now a Premium member!"
              : "You've used all 3 free trials. Upgrade to keep editing!"}
          </DialogDescription>
        </DialogHeader>

        {/* Success State */}
        {momoStep === "success" && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
            <Button className="w-full h-11 font-bold rounded-xl" onClick={handleDone}>
              Start Editing
            </Button>
          </div>
        )}

        {/* Failed State */}
        {momoStep === "failed" && (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm text-destructive">{statusMessage}</p>
            <Button className="w-full h-11 font-bold rounded-xl" variant="outline" onClick={() => setMomoStep("input")}>
              Try Again
            </Button>
          </div>
        )}

        {/* OTP Step */}
        {momoStep === "otp" && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <Smartphone className="w-12 h-12 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Enter OTP</p>
              <p className="text-xs text-muted-foreground">{statusMessage}</p>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="rounded-xl text-center text-lg tracking-widest"
              maxLength={10}
              autoFocus
            />
            <Button
              className="w-full h-11 font-bold rounded-xl"
              onClick={handleSubmitOtp}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
            <Button variant="ghost" className="w-full text-xs" onClick={() => { setMomoStep("input"); setOtp(""); }}>
              Cancel
            </Button>
          </div>
        )}

        {momoStep === "pending" && (
          <div className="py-6 text-center space-y-4">
            <div className="relative mx-auto w-16 h-16">
              <Phone className="w-16 h-16 text-primary mx-auto animate-pulse" />
            </div>
            <p className="text-sm font-medium">Check your phone</p>
            <p className="text-xs text-muted-foreground">{statusMessage}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for confirmation...
            </div>
          </div>
        )}

        {/* Input State */}
        {momoStep === "input" && (
          <>
            <div className="space-y-3 py-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold">Premium</span>
                  <span className="text-lg font-bold text-primary">GHS 100<span className="text-xs text-muted-foreground font-normal">/month</span></span>
                </div>
                <ul className="space-y-2">
                  {[
                    { icon: Zap, text: "100 AI tokens per month" },
                    { icon: Sparkles, text: "All edit modes & qualities" },
                    { icon: Shield, text: "Priority processing" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("mobile_money")}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                      paymentMethod === "mobile_money"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Smartphone className="w-4 h-4 shrink-0" />
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                      paymentMethod === "card"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    Card
                  </button>
                </div>
              </div>

              {/* MoMo fields */}
              {paymentMethod === "mobile_money" && (
                <div className="space-y-2">
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="e.g. 024 XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl"
                    maxLength={15}
                  />
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground text-center">
                  {paymentMethod === "card"
                    ? "Card starts an auto-renewing monthly subscription."
                    : "You'll receive a prompt on your phone to enter your PIN."}
                </p>
              </div>
            </div>

            <Button
              className="w-full h-11 font-bold rounded-xl"
              onClick={paymentMethod === "mobile_money" ? handleMoMoPay : handleCardSubscribe}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {paymentMethod === "mobile_money" ? "Sending prompt..." : "Connecting..."}
                </>
              ) : paymentMethod === "mobile_money" ? (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Pay GHS 100 via MoMo
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Subscribe — GHS 100/month
                </>
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
