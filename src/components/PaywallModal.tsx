import { useState } from "react";
import { Crown, Zap, Loader2, CreditCard, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
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
            amount: plan.price * 100,
            tokens: plan.tokens,
          }),
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

  const plan = plans.find((p) => p.id === selectedPlan)!;
  const isMomo = paymentMethod === "mobile_money";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
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
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
