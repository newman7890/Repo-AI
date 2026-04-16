-- Drop the false-condition permissive policies on user_credits (cleaner to have no policy at all)
DROP POLICY IF EXISTS "Block user deletes on credits" ON public.user_credits;
DROP POLICY IF EXISTS "Block user inserts on credits" ON public.user_credits;
DROP POLICY IF EXISTS "Block user updates on credits" ON public.user_credits;