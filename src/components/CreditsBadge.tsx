import { Coins, Crown, Infinity as InfinityIcon } from "lucide-react";
import type { UserCredits } from "@/hooks/useUserCredits";

interface CreditsBadgeProps {
  credits: UserCredits | null;
  loading: boolean;
  onClick?: () => void;
}

const CreditsBadge = ({ credits, loading, onClick }: CreditsBadgeProps) => {
  if (loading || !credits) return null;

  if (credits.isAdmin || credits.tokens >= 99999) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/40 text-xs font-semibold text-primary select-none cursor-default"
        title="Admin Account: Unlimited Access"
      >
        <Crown className="w-3.5 h-3.5 text-primary" />
        <span className="flex items-center gap-0.5">Admin <InfinityIcon className="w-3.5 h-3.5" /></span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border text-xs font-medium hover:bg-accent/10 transition-colors"
    >
      <Coins className="w-3.5 h-3.5 text-primary" />
      <span>{credits.tokens}</span>
    </button>
  );
};

export default CreditsBadge;
