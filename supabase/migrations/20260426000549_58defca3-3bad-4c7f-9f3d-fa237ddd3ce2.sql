CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, tokens, trial_uses_remaining)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$function$;