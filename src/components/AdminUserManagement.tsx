import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldBan, ShieldCheck, Crown, Users, Trash2 } from "lucide-react";

interface UserCredit {
  user_id: string;
  tokens: number;
  trial_uses_remaining: number;
  is_premium: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  device_info?: string;
  ip_address?: string;
  browser?: string;
  last_seen_at?: string;
  has_paid?: boolean;
}

type Filter = "all" | "paid" | "blocked";

const formatDateTime = (iso?: string) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserCredit | null>(null);

  const fetchUsers = async () => {
    // Fetch credits and profiles in parallel
    const [creditsRes, profilesRes, paymentsRes] = await Promise.all([
      supabase
        .from("user_credits")
        .select("user_id, tokens, trial_uses_remaining, is_premium, blocked, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, email, device_info, ip_address, browser, last_seen_at"),
      supabase
        .from("processed_payments")
        .select("user_id"),
    ]);

    if (creditsRes.error) {
      console.error("Failed to fetch users:", creditsRes.error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
      setLoading(false);
      return;
    }

    type ProfileRow = {
      user_id: string;
      email: string | null;
      device_info: string | null;
      ip_address: string | null;
      browser: string | null;
      last_seen_at: string | null;
    };
    const profileMap = new Map<string, ProfileRow>();
    (profilesRes.data || []).forEach((p: ProfileRow) => profileMap.set(p.user_id, p));

    const paidUserIds = new Set((paymentsRes.data || []).map((payment) => payment.user_id));

    const merged = (creditsRes.data || []).map(u => {
      const p = profileMap.get(u.user_id);
      return {
        ...u,
        email: p?.email || undefined,
        device_info: p?.device_info || undefined,
        ip_address: p?.ip_address || undefined,
        browser: p?.browser || undefined,
        last_seen_at: p?.last_seen_at || undefined,
        has_paid: paidUserIds.has(u.user_id),
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel("admin_users_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_credits" }, () => fetchUsers())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "processed_payments" }, () => fetchUsers())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        void fetchUsers();
        const profile = payload.new as { email?: string | null };
        toast({
          title: "New user joined",
          description: profile?.email || "A new account was created.",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => fetchUsers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    setToggling(userId);
    const { error } = await supabase
      .from("user_credits")
      .update({ blocked: !currentlyBlocked })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    } else {
      const user = users.find(u => u.user_id === userId);
      const label = user?.email || userId.slice(0, 8) + "…";
      toast({ title: currentlyBlocked ? "User Unblocked" : "User Blocked", description: `${label} has been ${currentlyBlocked ? "unblocked" : "blocked"}.` });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, blocked: !currentlyBlocked } : u));
    }
    setToggling(null);
  };

  const deleteUser = async (user: UserCredit) => {
    setDeleting(user.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: user.user_id },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      toast({
        title: "User deleted",
        description: `${user.email || user.user_id.slice(0, 8) + "…"} has been removed.`,
      });
      setUsers(prev => prev.filter(u => u.user_id !== user.user_id));
      setConfirmDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const filtered = users.filter(u => {
    if (filter === "paid") return !!u.has_paid;
    if (filter === "blocked") return u.blocked;
    return true;
  });

  const paidCount = users.filter(u => u.has_paid).length;
  const blockedCount = users.filter(u => u.blocked).length;

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Users className="w-4 h-4" /> User Management
          </CardTitle>
          <div className="flex gap-1.5">
            {(["all", "paid", "blocked"] as Filter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="text-xs h-7 px-2.5 capitalize"
              >
                {f === "all" ? `All (${users.length})` : f === "paid" ? `Paid (${paidCount})` : `Blocked (${blockedCount})`}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No users found.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-muted-foreground text-xs">
                   <th className="text-left py-2 pr-3">Email</th>
                   <th className="text-left py-2 px-2">Device</th>
                   <th className="text-left py-2 px-2">Browser</th>
                   <th className="text-left py-2 px-2">IP Address</th>
                   <th className="text-left py-2 px-2">Joined</th>
                   <th className="text-left py-2 px-2">Last Seen</th>
                   <th className="text-center py-2 px-2">Tokens</th>
                   <th className="text-center py-2 px-2">Trials</th>
                   <th className="text-center py-2 px-2">Status</th>
                   <th className="text-right py-2 pl-2">Action</th>
                 </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id} className="border-b border-border/30">
                    <td className="py-2.5 pr-3 text-xs text-foreground max-w-[200px] truncate" title={u.email || u.user_id}>
                       {u.email || <span className="font-mono text-muted-foreground">{u.user_id.slice(0, 12)}…</span>}
                     </td>
                     <td className="py-2.5 px-2 text-[10px] text-muted-foreground max-w-[150px] truncate" title={u.device_info || "Unknown"}>
                       {u.device_info ? u.device_info.split(" | ")[0] : "—"}
                     </td>
                     <td className="py-2.5 px-2 text-[10px] text-muted-foreground">
                       {u.browser || "—"}
                     </td>
                     <td className="py-2.5 px-2 text-[10px] font-mono text-muted-foreground" title={u.ip_address || ""}>
                       {u.ip_address || "—"}
                     </td>
                     <td className="py-2.5 px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                       {formatDateTime(u.created_at)}
                     </td>
                     <td className="py-2.5 px-2 text-[10px] text-muted-foreground whitespace-nowrap">
                       {formatDateTime(u.last_seen_at)}
                     </td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.tokens}</td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.trial_uses_remaining}</td>
                    <td className="text-center py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {u.is_premium && <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30"><Crown className="w-3 h-3 mr-0.5" />Premium</Badge>}
                        {!u.is_premium && u.has_paid && <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Crown className="w-3 h-3 mr-0.5" />Paid</Badge>}
                        {u.blocked && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><ShieldBan className="w-3 h-3 mr-0.5" />Blocked</Badge>}
                        {!u.is_premium && !u.has_paid && !u.blocked && <span className="text-muted-foreground text-xs">Free</span>}
                      </div>
                    </td>
                    <td className="text-right py-2.5 pl-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant={u.blocked ? "outline" : "destructive"}
                          className="text-xs h-7 px-2.5"
                          disabled={toggling === u.user_id}
                          onClick={() => toggleBlock(u.user_id, u.blocked)}
                        >
                          {u.blocked ? <><ShieldCheck className="w-3 h-3 mr-1" />Unblock</> : <><ShieldBan className="w-3 h-3 mr-1" />Block</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          disabled={deleting === u.user_id}
                          onClick={() => setConfirmDelete(u)}
                          title="Delete user permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {confirmDelete?.email || confirmDelete?.user_id.slice(0, 12) + "…"}
              </span>{" "}
              and all of their data (credits, profile, history, payments references). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deleting}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) deleteUser(confirmDelete);
              }}
            >
              {deleting ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminUserManagement;
