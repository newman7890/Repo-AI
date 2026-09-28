import { supabase } from "@/integrations/supabase/client";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  
  if (!token) {
    throw new Error("Not authenticated. Please sign in.");
  }

  return {
    "Content-Type": "application/json",
    "apikey": apikey,
    Authorization: `Bearer ${token}`,
  };
}
