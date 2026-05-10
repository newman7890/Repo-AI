import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-headers";

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
  return "Unknown";
}

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceModel = "Unknown";

  const mobileMatch = ua.match(/\(([^)]+)\)/);
  if (mobileMatch) {
    const info = mobileMatch[1];
    const androidMatch = info.match(/;\s*([^;]+)\s*Build/);
    if (androidMatch) deviceModel = androidMatch[1].trim();
    else if (/iPhone|iPad|iPod/.test(info)) {
      deviceModel = info.match(/(iPhone|iPad|iPod)/)?.[0] || "iOS Device";
    }
    else if (/Windows/.test(info)) deviceModel = "Windows PC";
    else if (/Macintosh/.test(info)) deviceModel = "Mac";
    else if (/Linux/.test(info)) deviceModel = "Linux PC";
    else deviceModel = info.split(";")[0]?.trim() || "Unknown";
  }

  const screenRes = `${screen.width}x${screen.height}`;
  const platform = navigator.platform || "Unknown";
  const browser = detectBrowser(ua);

  return {
    deviceModel,
    userAgent: ua,
    screenResolution: screenRes,
    platform,
    language: navigator.language,
    browser,
  };
}

export async function saveDeviceInfo(_userId: string, _email?: string) {
  const info = getDeviceInfo();
  const deviceStr = `${info.deviceModel} | ${info.screenResolution} | ${info.platform} | ${info.language}`;

  // Email is set server-side from the verified auth session — never trust the client.
  // Identity columns (email, ip_address, etc.) are blocked by the protect_profile_sensitive_columns trigger.
  await supabase.rpc("update_own_device_info", {
    p_device_info: deviceStr.slice(0, 512),
    p_user_agent: info.userAgent.slice(0, 1024),
    p_browser: info.browser.slice(0, 64),
  });
}

export async function notifyAdminNewUser(_userId: string, _email: string) {
  const info = getDeviceInfo();
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-new-user`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        deviceInfo: {
          deviceModel: info.deviceModel,
          screenResolution: info.screenResolution,
          platform: info.platform,
          userAgent: info.userAgent,
          browser: info.browser,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("notifyAdminNewUser failed:", error);
    }
  } catch (err) {
    console.error("notifyAdminNewUser failed:", err);
  }
}
