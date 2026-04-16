import { supabase } from "@/integrations/supabase/client";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    throw new Error("Not authenticated. Please sign in.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
