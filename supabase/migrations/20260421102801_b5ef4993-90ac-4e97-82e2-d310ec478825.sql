-- 1. Edit history table (user-owned, unlimited rows)
CREATE TABLE public.edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_image TEXT NOT NULL,
  result_image TEXT NOT NULL,
  description TEXT NOT NULL,
  mode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_edit_history_user_created ON public.edit_history (user_id, created_at DESC);

ALTER TABLE public.edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own edit history"
  ON public.edit_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own edit history"
  ON public.edit_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own edit history"
  ON public.edit_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all edit history"
  ON public.edit_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Add IP, browser, last seen to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;