import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setIsAdmin(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (!s) {
        setIsAdmin(false);
        return;
      }
      // Defer the role check so onAuthStateChange doesn't deadlock
      setTimeout(async () => {
        const { data, error } = await supabase.rpc("is_current_user_admin");
        setIsAdmin(!error && data === true);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined || (session && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
