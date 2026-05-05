-- Revoke broad anon access from new SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_referral_reward(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_referral_reward(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_withdrawal_paid(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_withdrawal_failed(uuid, text) FROM PUBLIC, anon, authenticated;

-- Grant the right roles
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text) TO authenticated;
-- Admin functions: keep callable by authenticated (they self-check has_role inside)
GRANT EXECUTE ON FUNCTION public.approve_referral_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_referral_reward(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_failed(uuid, text) TO authenticated;
