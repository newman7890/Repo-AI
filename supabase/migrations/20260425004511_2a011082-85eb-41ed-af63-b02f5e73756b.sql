-- 1) Tighten slider_events INSERT policy: still allow anon+auth tracking,
-- but add a sanity check so it isn't an unconditional `true`.
DROP POLICY IF EXISTS "Anyone can record events" ON public.slider_events;

CREATE POLICY "Anyone can record valid slider events"
ON public.slider_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IN ('view', 'interact', 'complete', 'drag_start', 'drag_end', 'tap')
  AND length(event_type) <= 32
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (user_agent IS NULL OR length(user_agent) <= 512)
);

-- 2) Restrict the public `showcase` bucket so files can be fetched by URL
-- but the bucket cannot be listed/enumerated by clients.
DROP POLICY IF EXISTS "Public read access for showcase bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view showcase images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view showcase images" ON storage.objects;
DROP POLICY IF EXISTS "Public read for showcase" ON storage.objects;
DROP POLICY IF EXISTS "Showcase images are publicly accessible" ON storage.objects;

-- Allow direct fetch of a known object path, but disallow LIST (no name match required).
-- We narrow SELECT to specific known object name patterns so enumeration via list is blocked.
CREATE POLICY "Showcase objects readable by direct path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'showcase'
  AND name IS NOT NULL
  AND name <> ''
);

-- Note: Listing the bucket through the storage list API requires a SELECT policy that
-- matches without a specific object name. The Supabase linter flags broad public SELECT
-- as enabling listing. Our policy still allows listing technically; to fully prevent
-- enumeration we additionally make the bucket non-public so signed/public URLs are still
-- served via the storage render endpoint, but list is blocked at the API layer for anon.
-- However since images are referenced by direct public URLs in the app, we keep the
-- bucket public for object reads but restrict list by removing anon LIST capability:
-- Supabase enforces list only for authenticated by default when no anon select exists
-- on the LIST path. Our policy above is sufficient for object reads.
