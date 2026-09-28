import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  tokens: number;
  trial_uses_remaining: number;
  is_premium: boolean;
  blocked: boolean;
  isAdmin?: boolean;
}

export function useUserCredits() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [creditsRes, adminRes] = await Promise.all([
      supabase
        .from("user_credits")
        .select("tokens, trial_uses_remaining, is_premium, blocked")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.rpc("is_current_user_admin"),
    ]);

    const isAdmin = adminRes.data === true;

    if (isAdmin) {
      setCredits({
        tokens: 999999,
        trial_uses_remaining: 999999,
        is_premium: true,
        blocked: false,
        isAdmin: true,
      });
    } else if (creditsRes.data) {
      setCredits({ ...creditsRes.data, isAdmin: false });
    } else {
      // New user — trigger will create row, default values
      setCredits({ tokens: 0, trial_uses_remaining: 0, is_premium: false, blocked: false, isAdmin: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { credits, loading, refresh };
}
