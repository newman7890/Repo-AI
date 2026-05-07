REVOKE EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_phone_verified(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.protect_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;