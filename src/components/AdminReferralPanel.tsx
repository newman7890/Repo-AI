import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Send, Flag } from "lucide-react";

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  reward_amount: number;
  status: string;
  plan_id: string | null;
  created_at: string;
}

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  momo_number: string;
  network: string;
  status: string;
  created_at: string;
  paystack_transfer_code: string | null;
}

const AdminReferralPanel = () => {
  const { toast } = useToast();
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [r, w] = await Promise.all([
      supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (r.data) setReferrals(r.data as ReferralRow[]);
    if (w.data) setWithdrawals(w.data as WithdrawalRow[]);
  };

  useEffect(() => { load(); }, []);

  const approveReferral = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("approve_referral_reward", { p_referral_id: id });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Approved" });
    await load(); setBusy(null);
  };

  const rejectReferral = async (id: string) => {
    const reason = prompt("Reason for rejection?") || "Rejected by admin";
    setBusy(id);
    const { error } = await supabase.rpc("reject_referral_reward", { p_referral_id: id, p_reason: reason });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Rejected" });
    await load(); setBusy(null);
  };

  const markPaid = async (id: string) => {
    const code = prompt("Paystack transfer code (optional):") || "";
    setBusy(id);
    const { error } = await supabase.rpc("mark_withdrawal_paid", { p_withdrawal_id: id, p_transfer_code: code || null });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Marked paid" });
    await load(); setBusy(null);
  };

  const markFailed = async (id: string) => {
    const reason = prompt("Reason for failure?") || "Failed";
    setBusy(id);
    const { error } = await supabase.rpc("mark_withdrawal_failed", { p_withdrawal_id: id, p_reason: reason });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Marked failed (refunded)" });
    await load(); setBusy(null);
  };

  const flagUser = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ flagged_suspicious: true }).eq("user_id", userId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "User flagged" });
  };

  const pendingReferrals = referrals.filter(r => r.status === "pending");
  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending" || w.status === "approved");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Referrals — Pending Approval
            <Badge variant="outline">{pendingReferrals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending referrals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-2">Date</th>
                  <th className="text-left px-2">Referrer</th>
                  <th className="text-left px-2">Referred</th>
                  <th className="text-right px-2">Reward</th>
                  <th className="text-right pl-2">Actions</th>
                </tr></thead>
                <tbody>
                  {pendingReferrals.map(r => (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-2 font-mono text-xs">{r.referrer_id.slice(0, 8)}…</td>
                      <td className="px-2 font-mono text-xs">{r.referred_user_id.slice(0, 8)}…</td>
                      <td className="text-right px-2 font-semibold">₵{Number(r.reward_amount).toFixed(2)}</td>
                      <td className="text-right pl-2 space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => approveReferral(r.id)} disabled={busy === r.id}><Check className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => rejectReferral(r.id)} disabled={busy === r.id}><X className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => flagUser(r.referred_user_id)} title="Flag referred user"><Flag className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Withdrawals — Pending Payout
            <Badge variant="outline">{pendingWithdrawals.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingWithdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending withdrawals.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-2">Date</th>
                  <th className="text-left px-2">User</th>
                  <th className="text-left px-2">MoMo</th>
                  <th className="text-right px-2">Amount</th>
                  <th className="text-right pl-2">Actions</th>
                </tr></thead>
                <tbody>
                  {pendingWithdrawals.map(w => (
                    <tr key={w.id} className="border-b border-border/30">
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="px-2 font-mono text-xs">{w.user_id.slice(0, 8)}…</td>
                      <td className="px-2 text-xs">{w.network.toUpperCase()} {w.momo_number}</td>
                      <td className="text-right px-2 font-semibold">₵{Number(w.amount).toFixed(2)}</td>
                      <td className="text-right pl-2 space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => markPaid(w.id)} disabled={busy === w.id}><Send className="w-3 h-3" />Paid</Button>
                        <Button size="sm" variant="outline" onClick={() => markFailed(w.id)} disabled={busy === w.id}><X className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">All withdrawals (recent)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2">Date</th>
                <th className="text-left">User</th>
                <th className="text-left">Net</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Status</th>
              </tr></thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id} className="border-b border-border/30">
                    <td className="py-1.5 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="font-mono">{w.user_id.slice(0, 6)}…</td>
                    <td>{w.network}</td>
                    <td className="text-right">₵{Number(w.amount).toFixed(2)}</td>
                    <td className="text-right"><Badge variant="outline">{w.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferralPanel;
