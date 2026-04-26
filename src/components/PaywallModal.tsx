import { useState, useEffect, useRef } from "react";
import { Crown, Zap, Loader2, CreditCard, Check, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const networks = [
  { id: "mtn", label: "MTN" },
  { id: "vod", label: "Vodafone" },
  { id: "atl", label: "AirtelTigo" },
] as const;

const isValidGhanaPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits.length === 9 ? `0${digits}` : digits;
  return /^0\d{9}$/.test(local);
};

type PaymentMethod = "card" | "mobile_money";
type Network = typeof networks[number]["id"];

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState<Network>("mtn");
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const pollRef = useRef<number | null>(null);
  const { toast } = useToast();

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const resetPaymentState = () => {
    stopPolling();
    setPendingRef(null);
    setStatusMsg("");
    setPaymentError("");
    setLoading(false);
    setOtpRequired(false);
    setOtp("");
    setSubmittingOtp(false);
  };

  const pollStatus = (reference: string) => {
    stopPolling();
    let attempts = 0;
    // M1: extend MoMo polling to ~10 minutes (120 attempts × 5s)
    const MAX_ATTEMPTS = 120;
    pollRef.current = window.setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-charge`,
          {
            method: "POST",
            headers: await getAuthHeaders(),
            body: JSON.stringify({ reference }),
          }
        );
        const data = await res.json();
        if (data.status === "success") {
          stopPolling();
          setLoading(false);
          setPendingRef(null);
          toast({ title: "Payment successful!", description: "Your tokens have been added." });
          setTimeout(() => window.location.reload(), 1000);
          return;
        } else if (data.status === "failed" || data.status === "abandoned") {
          stopPolling();
          setLoading(false);
          setPendingRef(null);
          toast({ title: "Payment failed", description: data.gateway_response || "Please try again.", variant: "destructive" });
          return;
        }
      } catch {
        // network blip — keep polling
      }
      if (attempts >= MAX_ATTEMPTS) {
        stopPolling();
        setLoading(false);
        setPendingRef(null);
        setStatusMsg("");
        toast({ title: "Timed out", description: "We didn't get confirmation. If you approved on your phone, your tokens will appear shortly — refresh in a moment.", variant: "destructive" });
      }
    }, 5000);
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setStatusMsg("");
    setPaymentError("");
    const plan = plans.find((p) => p.id === selectedPlan)!;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({
            payment_method: paymentMethod,
            plan_id: plan.id,
            phone: paymentMethod === "mobile_money" ? phone : undefined,
            provider: paymentMethod === "mobile_money" ? provider : undefined,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "We couldn't send the MoMo prompt. Check the number and network, then try again.");
      }

      if (paymentMethod === "mobile_money") {
        if (!data.reference) throw new Error("No payment reference returned");
        setPendingRef(data.reference);

        // Two possible Paystack flows — both stay in our app:
        //  1) pay_offline → PIN prompt pushed to handset, just poll
        //  2) send_otp    → user types OTP from SMS into our modal
        if (data.status === "send_otp" || data.status === "otp") {
          setOtpRequired(true);
          setStatusMsg(
            data.display_text ||
              "Enter the OTP sent to your phone to authorize this payment."
          );
          setLoading(false);
          return;
        }

        setStatusMsg(
          data.display_text ||
            "📱 Check your phone — approve the payment by entering your Mobile Money PIN."
        );
        pollStatus(data.reference);
        return;
      }

      // Card: Paystack hosted subscription checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setLoading(false);
      const message = err.message || "We couldn't send the MoMo prompt. Check the number and network, then try again.";
      setPaymentError(message);
      toast({ title: "Payment error", description: message, variant: "destructive" });
    }
  };

  const handleSubmitOtp = async () => {
    if (!pendingRef || !otp.trim()) return;
    setSubmittingOtp(true);
    setPaymentError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-submit-otp`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ otp: otp.trim(), reference: pendingRef }),
        }
      );
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Invalid OTP. Please try again.");
      }
      setOtpRequired(false);
      setOtp("");
      setStatusMsg(
        data.display_text || "Approved. Confirming payment…"
      );
      pollStatus(pendingRef);
    } catch (err: any) {
      setPaymentError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setSubmittingOtp(false);
    }
  };

  const plan = plans.find((p) => p.id === selectedPlan)!;
  const isMomo = paymentMethod === "mobile_money";
  const phoneValid = isValidGhanaPhone(phone);
  
  const canSubmit = isMomo ? phoneValid && !loading : !loading;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          resetPaymentState();
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-sm">
            Pick a plan and payment method to keep editing!
          </DialogDescription>
        </DialogHeader>

        {pendingRef ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-semibold">
                {otpRequired ? "Enter authorization code" : "Waiting for your approval…"}
              </p>
              <p className="text-sm text-muted-foreground mt-2 px-2">{statusMsg}</p>
            </div>

            {otpRequired ? (
              <div className="space-y-3 px-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setPaymentError("");
                  }}
                  maxLength={8}
                  className="h-11 text-center text-lg tracking-widest font-semibold"
                  autoFocus
                />
                {paymentError && (
                  <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive text-left">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}
                <Button
                  className="w-full h-11 font-bold rounded-xl"
                  onClick={handleSubmitOtp}
                  disabled={!otp.trim() || submittingOtp}
                >
                  {submittingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Authorize payment"
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Paystack sent an authorization code to your phone. Enter it here to complete the payment.
                </p>
              </div>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  Don't close this window. Tokens will be added automatically once you approve.
                </p>
              </>
            )}
          </div>
        ) : (
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
              </div>
            </div>

            {isMomo && (
              <div className="space-y-2 mt-2">
                <label className="text-xs font-semibold text-foreground block">
                  Mobile Money network
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {networks.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setProvider(n.id)}
                      className={cn(
                        "rounded-lg border-2 py-2 text-xs font-semibold transition-all",
                        provider === n.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-semibold text-foreground block mt-2">
                  MoMo phone number
                </label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="0241234567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPaymentError("");
                  }}
                  maxLength={13}
                  className="h-10"
                />
                <p className="text-[10px] text-muted-foreground">
                  We'll push a Mobile Money PIN prompt to this number. We do not ask for OTP codes.
                </p>
                {paymentError && (
                  <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-2 mt-2">
              <p className="text-[11px] text-muted-foreground text-center">
                {isMomo
                  ? "MTN, Vodafone & AirtelTigo supported. Pay once — tokens added instantly."
                  : "Auto-renewing monthly subscription. Cancel anytime."}
              </p>
            </div>

            <Button
              className="w-full h-11 font-bold rounded-xl mt-2"
              onClick={handleSubscribe}
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending prompt...
                </>
              ) : (
                <>
                  {isMomo ? <Smartphone className="w-4 h-4 mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  {isMomo
                    ? `Pay GHS ${plan.price} via MoMo`
                    : `Subscribe — GHS ${plan.price}/month`}
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
