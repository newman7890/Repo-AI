ALTER TABLE public.edit_history
  ADD CONSTRAINT edit_history_original_image_len CHECK (length(original_image) <= 8000000),
  ADD CONSTRAINT edit_history_result_image_len   CHECK (length(result_image)   <= 8000000),
  ADD CONSTRAINT edit_history_description_len    CHECK (length(description)    <= 2000),
  ADD CONSTRAINT edit_history_mode_len           CHECK (length(mode)           <= 64);

CREATE OR REPLACE FUNCTION public.enforce_edit_history_row_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.edit_history WHERE user_id = NEW.user_id;
  IF v_count >= 500 THEN
    RAISE EXCEPTION 'Edit history limit reached (500). Please delete older entries.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_edit_history_row_cap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_edit_history_row_cap ON public.edit_history;
CREATE TRIGGER trg_edit_history_row_cap
BEFORE INSERT ON public.edit_history
FOR EACH ROW EXECUTE FUNCTION public.enforce_edit_history_row_cap();