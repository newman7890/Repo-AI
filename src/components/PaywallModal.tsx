import { useEffect, useRef, useState } from "react";
import { Crown, Zap, Loader2, CreditCard, Check, Smartphone, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthHeaders } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  { id: "starter", name: "Starter", price: 50, tokens: 50 },
  { id: "standard", name: "Standard", price: 100, tokens: 100 },
  { id: "pro", name: "Pro", price: 200, tokens: 200, popular: true },
  { id: "premium", name: "Premium", price: 500, tokens: 500 },
];

type PaymentMethod = "card" | "mobile_money";
type Provider = "mtn" | "vod" | "atl";
type Step = "select" | "details" | "pin_pending" | "otp" | "success";

const NETWORKS: { id: Provider; label: string }[] = [
  { id: "mtn", label: "MTN" },
  { id: "vod", label: "Vodafone" },
  { id: "atl", label: "AirtelTigo" },
];

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [paymentError, setPaymentError] = useState<string>("");
  const [step, setStep] = useState<Step>("select");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Provider>("mtn");
  const [otp, setOtp] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setLoading(false);
    setPaymentError("");
    setStep("select");
    setPhone("");
    setProvider("mtn");
    setOtp("");
    setReference(null);
    setStatusMessage("");
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const startCardCheckout = async () => {
    setLoading(true);
    setPaymentError("");
    const plan = plans.find((p) => p.id === selectedPlan)!;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            payment_method: "card",
            plan_id: plan.id,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Couldn't start payment. Please try again.");
      }
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Couldn't start payment. Please try again.";
      setLoading(false);
      setPaymentError(message);
      toast({ title: "Payment error", description: message, variant: "destructive" });
    }
  };

  const verifyChargeOnce = async (ref: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-charge`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ reference: ref }),
      }
    );
    return response.json() as Promise<{ status?: string; gateway_response?: string; tokens_added?: number }>;
  };

  const startStatusPolling = (ref: string, attempts = 0) => {
    if (attempts > 40) {
      setPaymentError("We didn't get a confirmation in time. If you completed the prompt, your tokens will arrive shortly.");
      setLoading(false);
      return;
    }
    pollTimer.current = setTimeout(async () => {
      try {
        const result = await verifyChargeOnce(ref);
        if (result.status === "success") {
          setStep("success");
          setStatusMessage("Payment confirmed. Tokens added.");
          setLoading(false);
          toast({ title: "🎉 Payment successful", description: "Your tokens have been added." });
          return;
        }
        if (result.status === "failed") {
          setPaymentError(result.gateway_response || "Payment failed.");
          setStep("details");
          setLoading(false);
          return;
        }
        startStatusPolling(ref, attempts + 1);
      } catch {
        startStatusPolling(ref, attempts + 1);
      }
    }, 3500);
  };

  const startMomoCharge = async () => {
    setPaymentError("");
    const trimmed = phone.replace(/\s+/g, "");
    if (!/^(0\d{9}|233\d{9}|\+233\d{9})$/.test(trimmed)) {
      setPaymentError("Enter a valid Ghana mobile number (e.g. 024XXXXXXX).");
      return;
    }
    setLoading(true);
    const plan = plans.find((p) => p.id === selectedPlan)!;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-charge`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ plan_id: plan.id, provider, phone: trimmed }),
        }
      );
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Couldn't start payment. Please try again.");
      }
      setReference(data.reference);
      setStatusMessage(data.display_text || "");

      if (data.stage === "send_otp") {
        setStep("otp");
        setLoading(false);
        return;
      }
      if (data.stage === "send_pin" || data.stage === "pending") {
        setStep("pin_pending");
        startStatusPolling(data.reference);
        return;
      }
      if (data.stage === "success") {
        setStep("success");
        setLoading(false);
        toast({ title: "🎉 Payment successful", description: "Your tokens have been added." });
        return;
      }
      throw new Error("Unsupported payment step. Try card instead.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Couldn't start payment. Please try again.";
      setLoading(false);
      setPaymentError(message);
    }
  };

  const submitOtp = async () => {
    if (!reference) return;
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setPaymentError("Enter the OTP sent to your phone.");
      return;
    }
    setLoading(true);
    setPaymentError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-submit-otp`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ otp: otp.trim(), reference }),
        }
      );
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Invalid OTP. Try again.");
      }
      setStep("pin_pending");
      setStatusMessage(data.display_text || "Approving payment...");
      startStatusPolling(reference);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OTP failed.";
      setLoading(false);
      setPaymentError(message);
    }
  };

  const handlePrimaryAction = () => {
    if (paymentMethod === "card") return startCardCheckout();
    if (step === "select") {
      setStep("details");
      return;
    }
    if (step === "details") return startMomoCharge();
    if (step === "otp") return submitOtp();
  };

  const plan = plans.find((p) => p.id === selectedPlan)!;
  const isMomo = paymentMethod === "mobile_money";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {step === "details" && "Mobile Money details"}
            {step === "pin_pending" && "Approve on your phone"}
            {step === "otp" && "Enter OTP"}
            {step === "success" && "Payment confirmed"}
            {step === "select" && "Choose Your Plan"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === "select" && "Pick a plan and payment method to keep editing!"}
            {step === "details" && `Paying GHS ${plan.price} for ${plan.tokens} tokens`}
            {step === "pin_pending" && (statusMessage || "Check your phone for the PIN prompt and approve.")}
            {step === "otp" && (statusMessage || "Enter the one-time code sent to your phone.")}
            {step === "success" && "Tokens have been added to your account."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <>
        <div className="grid grid-cols-2 gap-2 py-3">
          {plans.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-all",
                selectedPlan === p.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              {p.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div className="font-bold text-sm">{p.name}</div>
              <div className="text-lg font-bold text-primary mt-1">
                GHS {p.price}
                <span className="text-[10px] text-muted-foreground font-normal">
                  {isMomo ? " one-time" : "/mo"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-primary" />
                {p.tokens} tokens
              </div>
              {selectedPlan === p.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Payment method selector */}
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">
            Payment method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("mobile_money")}
              className={cn(
                "rounded-xl border-2 p-2.5 flex flex-col items-center gap-1 transition-all",
                paymentMethod === "mobile_money"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-xs font-semibold">Mobile Money</span>
              <span className="text-[10px] text-muted-foreground">One-time payment</span>
            </button>
            <button
              onClick={() => setPaymentMethod("card")}
              className={cn(
                "rounded-xl border-2 p-2.5 flex flex-col items-center gap-1 transition-all",
                paymentMethod === "card"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-semibold">Card</span>
              <span className="text-[10px] text-muted-foreground">Auto-renews monthly</span>
            </button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-2 mt-2">
          <p className="text-[11px] text-muted-foreground text-center">
            {isMomo
              ? "Enter your number, we'll push a PIN prompt to your phone — no redirects."
              : "Auto-renewing monthly subscription via Paystack. Cancel anytime."}
          </p>
        </div>
          </>
        )}

        {step === "details" && (
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Network</Label>
              <div className="grid grid-cols-3 gap-2">
                {NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setProvider(n.id)}
                    className={cn(
                      "rounded-xl border-2 p-2 text-xs font-semibold transition-all",
                      provider === n.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="momo-phone" className="text-xs font-semibold mb-1.5 block">
                Mobile Money number
              </Label>
              <Input
                id="momo-phone"
                type="tel"
                inputMode="tel"
                placeholder="024XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={15}
                className="h-11"
              />
            </div>
          </div>
        )}

        {step === "pin_pending" && (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground max-w-xs">
              {statusMessage || "We've sent a PIN prompt to your phone. Enter your Mobile Money PIN to approve the payment."}
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3 py-2">
            <Label htmlFor="momo-otp" className="text-xs font-semibold block">
              One-time code from your phone
            </Label>
            <Input
              id="momo-otp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              className="h-11 text-center tracking-widest text-base"
            />
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          </div>
        )}

        {paymentError && (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive mt-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {(step === "details" || step === "otp") && (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => {
                setPaymentError("");
                setStep(step === "otp" ? "details" : "select");
              }}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          {step === "success" ? (
            <Button className="flex-1 h-11 rounded-xl font-bold" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : step === "pin_pending" ? (
            <Button className="flex-1 h-11 rounded-xl font-bold" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Waiting for approval...
            </Button>
          ) : (
            <Button
              className="flex-1 h-11 font-bold rounded-xl"
              onClick={handlePrimaryAction}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {paymentMethod === "card" ? "Redirecting..." : "Sending prompt..."}
                </>
              ) : paymentMethod === "card" ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Subscribe — GHS {plan.price}/month
                </>
              ) : step === "select" ? (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Continue — GHS {plan.price}
                </>
              ) : step === "otp" ? (
                "Submit OTP"
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Send PIN prompt
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
