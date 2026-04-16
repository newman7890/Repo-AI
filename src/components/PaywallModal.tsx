import { useState } from "react";
import { Crown, Zap, Shield, Sparkles, Loader2, CreditCard, Smartphone } from "lucide-react";
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

type PaymentMethod = "card" | "mobile_money";

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ payment_method: paymentMethod }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to start checkout");
      }

      window.location.href = data.authorization_url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Payment error",
        description: err.message || "Could not start checkout. Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2" style={{ background: "var(--gradient-primary)" }}>
            <Crown className="w-7 h-7 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold">Upgrade to Premium</DialogTitle>
          <DialogDescription className="text-sm">
            You've used all 3 free trials. Upgrade to keep editing!
          </DialogDescription>
        </DialogHeader>

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

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground text-center">
              <strong>Token costs:</strong> Fast = 1 · High = 2 · Ultra = 3 · Face Swap = 5
            </p>
          </div>
        </div>

        <Button
          className="w-full h-11 font-bold rounded-xl"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting to Paystack...
            </>
          ) : (
            <>
              {paymentMethod === "mobile_money" ? (
                <Smartphone className="w-4 h-4 mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Subscribe — GHS 100/month
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
