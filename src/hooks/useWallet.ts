import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WalletData {
  wallet_available: number;
  wallet_pending: number;
  total_earned: number;
  referral_code: string | null;
  phone_number: string | null;
  phone_verified: boolean;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [creditsRes, profileRes] = await Promise.all([
      supabase
        .from("user_credits")
        .select("wallet_available, wallet_pending, total_earned")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("referral_code, phone_number, phone_verified")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    setWallet({
      wallet_available: Number(creditsRes.data?.wallet_available ?? 0),
      wallet_pending: Number(creditsRes.data?.wallet_pending ?? 0),
      total_earned: Number(creditsRes.data?.total_earned ?? 0),
      referral_code: profileRes.data?.referral_code ?? null,
      phone_number: profileRes.data?.phone_number ?? null,
      phone_verified: profileRes.data?.phone_verified ?? false,
    });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { wallet, loading, refresh };
}
