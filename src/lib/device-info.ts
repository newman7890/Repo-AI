import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-headers";

export function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceModel = "Unknown";

  // Try to extract device model
  const mobileMatch = ua.match(/\(([^)]+)\)/);
  if (mobileMatch) {
    const info = mobileMatch[1];
    // Android
    const androidMatch = info.match(/;\s*([^;]+)\s*Build/);
    if (androidMatch) deviceModel = androidMatch[1].trim();
    // iPhone/iPad
    else if (/iPhone|iPad|iPod/.test(info)) {
      deviceModel = info.match(/(iPhone|iPad|iPod)/)?.[0] || "iOS Device";
    }
    // Desktop
    else if (/Windows/.test(info)) deviceModel = "Windows PC";
    else if (/Macintosh/.test(info)) deviceModel = "Mac";
    else if (/Linux/.test(info)) deviceModel = "Linux PC";
    else deviceModel = info.split(";")[0]?.trim() || "Unknown";
  }

  const screenRes = `${screen.width}x${screen.height}`;
  const platform = navigator.platform || "Unknown";

  return {
    deviceModel,
    userAgent: ua,
    screenResolution: screenRes,
    platform,
    language: navigator.language,
  };
}

export async function saveDeviceInfo(userId: string, email?: string) {
  const info = getDeviceInfo();
  const deviceStr = `${info.deviceModel} | ${info.screenResolution} | ${info.platform} | ${info.language}`;

  const payload = {
    user_id: userId,
    device_info: deviceStr,
    user_agent: info.userAgent,
    ...(email ? { email } : {}),
  };

  const { data: existingRows } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingRows && existingRows.length > 0) {
    await supabase.from("profiles").update(payload).eq("user_id", userId);
    return;
  }

  await supabase.from("profiles").insert(payload);
}

export async function notifyAdminNewUser(_userId: string, _email: string) {
  const info = getDeviceInfo();
  // Inserting into admin_notifications requires service-role privileges.
  // Delegate to a secure edge function that validates the caller's JWT.
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
