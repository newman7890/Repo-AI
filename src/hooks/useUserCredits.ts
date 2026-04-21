import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserCredits {
  tokens: number;
  trial_uses_remaining: number;
  is_premium: boolean;
  blocked: boolean;
}

export function useUserCredits() {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("user_credits")
      .select("tokens, trial_uses_remaining, is_premium, blocked")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setCredits(data);
    } else {
      // New user — trigger will create row, default values
      setCredits({ tokens: 3, trial_uses_remaining: 0, is_premium: false, blocked: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { credits, loading, refresh };
}
