import { Coins, Flame } from "lucide-react";
import type { UserCredits } from "@/hooks/useUserCredits";

interface CreditsBadgeProps {
  credits: UserCredits | null;
  loading: boolean;
  onClick?: () => void;
}

const CreditsBadge = ({ credits, loading, onClick }: CreditsBadgeProps) => {
  if (loading || !credits) return null;

  const hasTrials = credits.trial_uses_remaining > 0;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border text-xs font-medium hover:bg-accent/10 transition-colors"
    >
      {hasTrials ? (
        <>
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span>{credits.trial_uses_remaining} trial{credits.trial_uses_remaining !== 1 ? "s" : ""}</span>
        </>
      ) : (
        <>
          <Coins className="w-3.5 h-3.5 text-primary" />
          <span>{credits.tokens}</span>
        </>
      )}
    </button>
  );
};

export default CreditsBadge;
