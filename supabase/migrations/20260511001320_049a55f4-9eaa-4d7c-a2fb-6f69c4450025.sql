-- The protect_profile_sensitive_columns trigger already blocks every meaningful
-- column from being written by authenticated users, making the broad UPDATE
-- policy effectively dead code that confuses scanners. All legitimate profile
-- mutations go through SECURITY DEFINER functions (update_own_device_info,
-- mark_phone_verified, mark_email_verified) or admin paths.
DROP POLICY IF EXISTS "Users can update own profile safe columns" ON public.profiles;