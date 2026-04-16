import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Settings, BarChart3, LogOut, Crown } from "lucide-react";
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
const UserMenu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
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
