import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CALLS_PER_HOUR = 30;

export async function checkRateLimit(
  sb: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await sb
    .from("llm_calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    // Fail open — no bloqueamos usuarios si la consulta falla
    console.error("[rateLimit] check failed:", error.message);
    return { allowed: true };
  }

  return { allowed: (count ?? 0) < MAX_CALLS_PER_HOUR };
}
