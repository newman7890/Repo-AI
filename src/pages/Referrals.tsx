import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Copy, Share2, Wallet, Clock, TrendingUp, Gift, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { SEO } from "@/components/SEO";

interface ReferralRow {
  id: string;
  reward_amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  plan_id: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  approved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  paid: "bg-primary/15 text-primary border-primary/30",
};

const Referrals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet, loading } = useWallet();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("my_referrals")
        .select("id, reward_amount, status, plan_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setReferrals(data as ReferralRow[]);
    })();
  }, []);

  const referralLink = wallet?.referral_code
    ? `https://renderme.site/auth?ref=${wallet.referral_code}`
    : "";

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard." });
  };

  const shareWhatsapp = () => {
    const msg = `Hey! Try Renderme AI, AI photo editing & face swap. Sign up with my link and get started: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Renderme AI",
          text: "Edit photos with AI, join with my invite link",
          url: referralLink,
        });
      } catch { /* user cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Referrals & Rewards" description="Invite friends to Renderme AI and earn cash rewards." canonical="/referrals" noindex />
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Referrals & Rewards</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Balance cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1 text-muted-foreground"><Wallet className="w-3 h-3" />Available</CardTitle></CardHeader>
            <CardContent className="p-3 pt-0"><p className="text-xl md:text-2xl font-bold text-emerald-500">₵{wallet?.wallet_available.toFixed(2) ?? "0.00"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" />Pending</CardTitle></CardHeader>
            <CardContent className="p-3 pt-0"><p className="text-xl md:text-2xl font-bold text-yellow-500">₵{wallet?.wallet_pending.toFixed(2) ?? "0.00"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-1"><CardTitle className="text-xs flex items-center gap-1 text-muted-foreground"><TrendingUp className="w-3 h-3" />Total Earned</CardTitle></CardHeader>
            <CardContent className="p-3 pt-0"><p className="text-xl md:text-2xl font-bold">₵{wallet?.total_earned.toFixed(2) ?? "0.00"}</p></CardContent>
          </Card>
        </div>

        {/* Referral link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4" />Your invite link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Earn <span className="text-foreground font-semibold">10% cash reward</span> on each friend's first subscription.
              They sign up, pay, and you get paid.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border/50 text-sm font-mono truncate">
                {loading ? "Loading…" : referralLink || "—"}
              </div>
              <Button variant="outline" size="icon" onClick={copyLink} disabled={!referralLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={shareWhatsapp} disabled={!referralLink}>
                <Share2 className="w-4 h-4" />WhatsApp
              </Button>
              <Button variant="secondary" onClick={nativeShare} disabled={!referralLink}>
                <Share2 className="w-4 h-4" />Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Withdraw CTA */}
        <Link to="/withdraw">
          <Button className="w-full h-12 bg-gradient-to-r from-primary to-primary/80">
            Withdraw to Mobile Money <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>

        {/* History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Referral history</CardTitle></CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No referrals yet. Share your link to start earning!</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {referrals.map((r) => (
                  <li key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">+₵{Number(r.reward_amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{r.plan_id ?? "—"} • {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Referrals;
