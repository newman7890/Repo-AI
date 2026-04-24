import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "renderme_session_id";

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export type SliderEventType = "view" | "drag_start" | "drag_complete" | "cta_click";

// Dedupe per session+example+event so we don't spam the table
const fired = new Set<string>();

export async function trackSliderEvent(
  exampleId: string | null,
  eventType: SliderEventType,
): Promise<void> {
  if (!exampleId) return;
  const key = `${exampleId}:${eventType}`;
  // Only dedupe view + drag_start (drag_complete can fire repeatedly per session)
  if (eventType !== "drag_complete" && fired.has(key)) return;
  fired.add(key);

  try {
    await supabase.from("slider_events").insert({
      example_id: exampleId,
      event_type: eventType,
      session_id: getSessionId(),
      user_agent: navigator.userAgent.slice(0, 255),
    });
  } catch (err) {
    // Non-critical: never break UX for analytics
    console.debug("slider event failed", err);
  }
}
