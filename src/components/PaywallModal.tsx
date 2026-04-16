import { useState } from "react";
import { Crown, Zap, Loader2, CreditCard, Check } from "lucide-react";
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

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("standard");
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
            payment_method: "card",
            plan_id: plan.id,
            amount: plan.price * 100, // pesewas
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-sm">
            You've used all 3 free trials. Pick a plan to keep editing!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative rounded-xl border-2 p-3 text-left transition-all",
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div className="font-bold text-sm">{plan.name}</div>
              <div className="text-lg font-bold text-primary mt-1">
                GHS {plan.price}
                <span className="text-[10px] text-muted-foreground font-normal">/mo</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <Zap className="w-3 h-3 text-primary" />
                {plan.tokens} tokens
              </div>
              {selectedPlan === plan.id && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-[11px] text-muted-foreground text-center">
            Auto-renewing monthly subscription. Cancel anytime.
          </p>
        </div>

        <Button
          className="w-full h-11 font-bold rounded-xl"
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
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe — GHS {plans.find((p) => p.id === selectedPlan)!.price}/month
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
