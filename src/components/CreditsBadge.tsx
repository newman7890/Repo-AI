import { Coins } from "lucide-react";
import type { UserCredits } from "@/hooks/useUserCredits";

interface CreditsBadgeProps {
  credits: UserCredits | null;
  loading: boolean;
  onClick?: () => void;
}

const CreditsBadge = ({ credits, loading, onClick }: CreditsBadgeProps) => {
  if (loading || !credits) return null;

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
