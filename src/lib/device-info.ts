import { supabase } from "@/integrations/supabase/client";

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

export async function saveDeviceInfo(userId: string) {
  const info = getDeviceInfo();
  const deviceStr = `${info.deviceModel} | ${info.screenResolution} | ${info.platform} | ${info.language}`;

  await supabase
    .from("profiles")
    .update({
      device_info: deviceStr,
      user_agent: info.userAgent,
    })
    .eq("user_id", userId);
}

export async function notifyAdminNewUser(userId: string, email: string) {
  const info = getDeviceInfo();
  await supabase.from("admin_notifications").insert({
    user_id: userId,
    type: "registration",
    title: "New User Registered",
    message: `${email} just signed up`,
    metadata: {
      email,
      device_model: info.deviceModel,
      screen: info.screenResolution,
      platform: info.platform,
      user_agent: info.userAgent,
    },
  });
}
