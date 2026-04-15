-- Create app_role enum and user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can read user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  function_name text NOT NULL,
  model text NOT NULL,
  mode text,
  quality text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all usage logs"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));