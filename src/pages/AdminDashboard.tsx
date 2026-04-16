import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BarChart3, Users, Zap, Clock } from "lucide-react";
import AdminUserManagement from "@/components/AdminUserManagement";
import AdminNotifications from "@/components/AdminNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface UsageLog {
  id: string;
  user_id: string;
  function_name: string;
  model: string;
  mode: string | null;
  quality: string | null;
  created_at: string;
}

interface UserStats {
  user_id: string;
  email: string;
  total_requests: number;
  edit_photo_count: number;
  enhance_prompt_count: number;
  last_active: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to fetch logs:", error);
      toast({ title: "Error", description: "Failed to load usage data", variant: "destructive" });
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getUserStats = (): UserStats[] => {
    const map = new Map<string, UserStats>();
    for (const log of logs) {
      const existing = map.get(log.user_id) || {
        user_id: log.user_id,
        email: log.user_id.slice(0, 8) + "…",
        total_requests: 0,
        edit_photo_count: 0,
        enhance_prompt_count: 0,
        last_active: log.created_at,
      };
      existing.total_requests++;
      if (log.function_name === "edit-photo") existing.edit_photo_count++;
      if (log.function_name === "enhance-prompt") existing.enhance_prompt_count++;
      if (log.created_at > existing.last_active) existing.last_active = log.created_at;
      map.set(log.user_id, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total_requests - a.total_requests);
  };

  const totalEdits = logs.filter(l => l.function_name === "edit-photo").length;
  const totalEnhances = logs.filter(l => l.function_name === "enhance-prompt").length;
  const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
  const todayCount = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm">You don't have admin permissions.</p>
        <Button variant="outline" onClick={() => navigate("/")}>Go Back</Button>
      </div>
    );
  }

  const userStats = getUserStats();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-border">
        <div className="max-w-6xl mx-auto w-full flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h1 className="text-lg md:text-xl font-bold text-foreground font-display">Usage Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-4 md:space-y-6 max-w-6xl mx-auto w-full">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Zap className="w-3.5 h-3.5" /> Total Edits
              </div>
              <p className="text-2xl font-bold text-foreground">{totalEdits}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Zap className="w-3.5 h-3.5" /> Enhancements
              </div>
              <p className="text-2xl font-bold text-foreground">{totalEnhances}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3.5 h-3.5" /> Users
              </div>
              <p className="text-2xl font-bold text-foreground">{uniqueUsers}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Clock className="w-3.5 h-3.5" /> Today
              </div>
              <p className="text-2xl font-bold text-foreground">{todayCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Notifications */}
        <AdminNotifications />

        {/* User Management */}
        <AdminUserManagement />

        {/* Per-User Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Usage by User</CardTitle>
          </CardHeader>
          <CardContent>
            {userStats.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No usage data yet. Usage will appear here after users make AI requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">User ID</th>
                      <th className="text-center py-2 px-2">Edits</th>
                      <th className="text-center py-2 px-2">Enhances</th>
                      <th className="text-center py-2 px-2">Total</th>
                      <th className="text-right py-2 pl-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50">
                        <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{u.user_id.slice(0, 12)}…</td>
                        <td className="text-center py-2.5 px-2 text-foreground">{u.edit_photo_count}</td>
                        <td className="text-center py-2.5 px-2 text-foreground">{u.enhance_prompt_count}</td>
                        <td className="text-center py-2.5 px-2 font-semibold text-primary">{u.total_requests}</td>
                        <td className="text-right py-2.5 pl-4 text-muted-foreground text-xs">
                          {new Date(u.last_active).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No requests logged yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-3">Time</th>
                      <th className="text-left py-2 px-2">Function</th>
                      <th className="text-left py-2 px-2">Model</th>
                      <th className="text-left py-2 px-2">Mode</th>
                      <th className="text-left py-2 pl-2">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="border-b border-border/30">
                        <td className="py-2 pr-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 px-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            log.function_name === "edit-photo" 
                              ? "bg-primary/20 text-primary" 
                              : "bg-accent/20 text-accent"
                          }`}>
                            {log.function_name}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-xs text-foreground font-mono">
                          {log.model.split("/")[1] || log.model}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{log.mode || "—"}</td>
                        <td className="py-2 pl-2 text-xs font-mono text-muted-foreground">{log.user_id.slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
