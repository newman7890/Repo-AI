import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { SEO } from "@/components/SEO";

interface WithdrawalRow {
  id: string; amount: number; status: string; momo_number: string; network: string; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  approved: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const MIN = 50;

const Withdraw = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet, loading, refresh } = useWallet();
  const [amount, setAmount] = useState("");
  const [momo, setMomo] = useState("");
  const [network, setNetwork] = useState<string>("mtn");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WithdrawalRow[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select("id, amount, status, momo_number, network, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as WithdrawalRow[]);
  };

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    if (wallet?.phone_number && !momo) setMomo(wallet.phone_number);
  }, [wallet, momo]);

  const amountNum = parseFloat(amount) || 0;
  const canSubmit =
    amountNum >= MIN &&
    amountNum <= (wallet?.wallet_available ?? 0) &&
    momo.trim().length >= 9 &&
    !!network &&
    !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("request_withdrawal", {
        p_amount: amountNum,
        p_momo_number: momo.trim(),
        p_network: network,
      });
      if (error) throw error;
      toast({ title: "Withdrawal requested", description: "We'll process it within 24 hours." });
      setAmount("");
      await Promise.all([refresh(), loadHistory()]);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Could not submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Withdraw Earnings" description="Withdraw your Renderme AI referral rewards securely via Mobile Money or bank transfer in just a few taps." canonical="/withdraw" noindex />
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to referrals" onClick={() => navigate("/referrals")} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Withdraw to MoMo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-3xl font-bold text-emerald-500">₵{wallet?.wallet_available.toFixed(2) ?? "0.00"}</p>
            <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal ₵{MIN}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4" />Withdrawal details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GHS)</Label>
                <Input id="amount" type="number" min={MIN} step="0.01" placeholder={`Min ${MIN}`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select value={network} onValueChange={setNetwork}>
                  <SelectTrigger id="network"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN MoMo</SelectItem>
                    <SelectItem value="vodafone">Vodafone Cash</SelectItem>
                    <SelectItem value="airteltigo">AirtelTigo Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="momo">Mobile Money number</Label>
                <Input id="momo" type="tel" placeholder="0241234567" value={momo} onChange={(e) => setMomo(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full h-11" disabled={!canSubmit}>
                {submitting ? "Submitting…" : `Withdraw ₵${amountNum.toFixed(2) || "0.00"}`}
              </Button>
              {amountNum > 0 && amountNum < MIN && (
                <p className="text-xs text-destructive">Minimum is ₵{MIN}</p>
              )}
              {amountNum > (wallet?.wallet_available ?? 0) && (
                <p className="text-xs text-destructive">Insufficient available balance</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent withdrawals</CardTitle></CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {history.map((w) => (
                  <li key={w.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">₵{Number(w.amount).toFixed(2)} · {w.network.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{w.momo_number} • {new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className={STATUS_STYLES[w.status]}>{w.status}</Badge>
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

export default Withdraw;
