import { Crown, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PaywallModal = ({ open, onOpenChange }: PaywallModalProps) => {
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
              <span className="text-lg font-bold text-primary">$10<span className="text-xs text-muted-foreground font-normal">/month</span></span>
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

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground text-center">
              <strong>Token costs:</strong> Fast = 1 · High = 2 · Ultra = 3 · Face Swap = 5
            </p>
          </div>
        </div>

        <Button
          className="w-full h-11 font-bold rounded-xl"
          onClick={() => {
            // TODO: Connect to payment provider
            window.open("https://renderme-ai.lovable.app/premium", "_blank");
          }}
        >
          <Crown className="w-4 h-4 mr-2" />
          Subscribe — $10/month
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
