
-- Add blocked column
ALTER TABLE public.user_credits ADD COLUMN blocked boolean NOT NULL DEFAULT false;

-- Allow admins to update user_credits (for blocking)
CREATE POLICY "Admins can update user_credits"
ON public.user_credits
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all user_credits
CREATE POLICY "Admins can read all user_credits"
ON public.user_credits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
