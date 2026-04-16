import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Settings, BarChart3, LogOut, Crown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useUserCredits } from "@/hooks/useUserCredits";
import PaywallModal from "@/components/PaywallModal";
import { getAuthHeaders } from "@/lib/auth-headers";

const UserMenu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const { credits } = useUserCredits();

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: "Failed to sign out", variant: "destructive" });
      setLoggingOut(false);
    } else {
      navigate("/auth");
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-checkout`,
        {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ payment_method: "mobile_money" }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to start checkout");
      window.location.href = data.authorization_url;
    } catch (err: any) {
      toast({ title: "Renewal error", description: err.message, variant: "destructive" });
    } finally {
      setRenewing(false);
    }
  };

  const showRenew = credits?.is_premium && credits.tokens <= 10;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-lg h-8 w-8">
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!credits?.is_premium && (
          <>
            <DropdownMenuItem onClick={() => setShowPaywall(true)} className="gap-2 cursor-pointer text-primary font-semibold">
              <Crown className="w-4 h-4" />
              Upgrade to Premium
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {showRenew && (
          <>
            <DropdownMenuItem onClick={handleRenew} disabled={renewing} className="gap-2 cursor-pointer text-primary font-semibold">
              <RefreshCw className={`w-4 h-4 ${renewing ? "animate-spin" : ""}`} />
              {renewing ? "Starting…" : "Renew Tokens (MoMo)"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer">
              <BarChart3 className="w-4 h-4" />
              Usage Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={loggingOut}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? "Signing out…" : "Sign Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </>
  );
};

export default UserMenu;
