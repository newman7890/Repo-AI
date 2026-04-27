type CheckoutAlertArgs = {
  source: string;
  stage: string;
  error: unknown;
  userId?: string | null;
  reference?: string | null;
  context?: Record<string, unknown>;
};

export function isPolicyFailure(error: unknown): boolean {
  const text = JSON.stringify(error || {}).toLowerCase();
  return text.includes("row-level security") ||
    text.includes("violates row-level security") ||
    text.includes("permission denied") ||
    text.includes("policy") ||
    text.includes("42501");
}

function cleanError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, unknown>;
    return {
      message: value.message,
      code: value.code,
      details: value.details,
      hint: value.hint,
    };
  }
  return { message: String(error) };
}

export async function alertCheckoutPolicyFailure(supabase: any, args: CheckoutAlertArgs) {
  const payload = {
    source: args.source,
    stage: args.stage,
    user_id: args.userId || null,
    reference: args.reference || null,
    error: cleanError(args.error),
    context: args.context || {},
  };

  console.error("checkout_policy_failure", JSON.stringify(payload));

  if (!isPolicyFailure(args.error)) return;

  try {
    await supabase.from("admin_notifications").insert({
      user_id: args.userId || null,
      type: "checkout_alert",
      title: "Checkout policy failure detected",
      message: `${args.source} failed at ${args.stage}${args.reference ? ` for ${args.reference}` : ""}`,
      metadata: payload,
    });
  } catch (notifyError) {
    console.error("checkout_policy_alert_failed", JSON.stringify(cleanError(notifyError)));
  }
}