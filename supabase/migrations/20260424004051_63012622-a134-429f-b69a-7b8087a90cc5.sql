-- Showcase examples table
CREATE TABLE public.showcase_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  before_image text NOT NULL,
  after_image text NOT NULL,
  before_alt text NOT NULL DEFAULT '',
  after_alt text NOT NULL DEFAULT '',
  prompt text NOT NULL,
  generation_seconds numeric(5,1) NOT NULL DEFAULT 12.0,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published examples"
ON public.showcase_examples
FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE POLICY "Admins can view all examples"
ON public.showcase_examples
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert examples"
ON public.showcase_examples
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update examples"
ON public.showcase_examples
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete examples"
ON public.showcase_examples
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_showcase_examples_updated_at
BEFORE UPDATE ON public.showcase_examples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Slider analytics events
CREATE TABLE public.slider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  example_id uuid REFERENCES public.showcase_examples(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view', 'drag_start', 'drag_complete', 'cta_click')),
  session_id text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_slider_events_example ON public.slider_events(example_id, event_type);
CREATE INDEX idx_slider_events_created ON public.slider_events(created_at DESC);

ALTER TABLE public.slider_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record events"
ON public.slider_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read events"
ON public.slider_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for showcase images
INSERT INTO storage.buckets (id, name, public)
VALUES ('showcase', 'showcase', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Showcase images are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'showcase');

CREATE POLICY "Admins can upload showcase images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'showcase' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update showcase images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'showcase' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete showcase images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'showcase' AND has_role(auth.uid(), 'admin'::app_role));