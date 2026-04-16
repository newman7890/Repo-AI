import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldBan, ShieldCheck, Crown, Users } from "lucide-react";

interface UserCredit {
  user_id: string;
  tokens: number;
  trial_uses_remaining: number;
  is_premium: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
}

type Filter = "all" | "premium" | "blocked";

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("user_credits")
      .select("user_id, tokens, trial_uses_remaining, is_premium, blocked, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleBlock = async (userId: string, currentlyBlocked: boolean) => {
    setToggling(userId);
    const { error } = await supabase
      .from("user_credits")
      .update({ blocked: !currentlyBlocked })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    } else {
      toast({ title: currentlyBlocked ? "User Unblocked" : "User Blocked", description: `User ${userId.slice(0, 8)}… has been ${currentlyBlocked ? "unblocked" : "blocked"}.` });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, blocked: !currentlyBlocked } : u));
    }
    setToggling(null);
  };

  const filtered = users.filter(u => {
    if (filter === "premium") return u.is_premium;
    if (filter === "blocked") return u.blocked;
    return true;
  });

  const premiumCount = users.filter(u => u.is_premium).length;
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
            {(["all", "premium", "blocked"] as Filter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="text-xs h-7 px-2.5 capitalize"
              >
                {f === "all" ? `All (${users.length})` : f === "premium" ? `Premium (${premiumCount})` : `Blocked (${blockedCount})`}
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
                  <th className="text-left py-2 pr-3">User ID</th>
                  <th className="text-center py-2 px-2">Tokens</th>
                  <th className="text-center py-2 px-2">Trials</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-right py-2 pl-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id} className="border-b border-border/30">
                    <td className="py-2.5 pr-3 font-mono text-xs text-foreground">{u.user_id.slice(0, 12)}…</td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.tokens}</td>
                    <td className="text-center py-2.5 px-2 text-foreground">{u.trial_uses_remaining}</td>
                    <td className="text-center py-2.5 px-2">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {u.is_premium && <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30"><Crown className="w-3 h-3 mr-0.5" />Premium</Badge>}
                        {u.blocked && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><ShieldBan className="w-3 h-3 mr-0.5" />Blocked</Badge>}
                        {!u.is_premium && !u.blocked && <span className="text-muted-foreground text-xs">Free</span>}
                      </div>
                    </td>
                    <td className="text-right py-2.5 pl-2">
                      <Button
                        size="sm"
                        variant={u.blocked ? "outline" : "destructive"}
                        className="text-xs h-7 px-2.5"
                        disabled={toggling === u.user_id}
                        onClick={() => toggleBlock(u.user_id, u.blocked)}
                      >
                        {u.blocked ? <><ShieldCheck className="w-3 h-3 mr-1" />Unblock</> : <><ShieldBan className="w-3 h-3 mr-1" />Block</>}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUserManagement;
