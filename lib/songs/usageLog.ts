import { getSupabaseServer } from "@/lib/supabase/server";

function defaultModel(provider: string): string {
  switch (provider) {
    case "gemini": return "gemini-2.0-flash";
    case "groq": return "llama-3.3-70b-versatile";
    case "openrouter": return "mistralai/mistral-7b-instruct:free";
    default: return "unknown";
  }
}

export async function logLlmCall(params: {
  userId: string;
  songId?: string;
  callType: "generate" | "rewrite" | "review" | "compare";
  provider: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  status: "success" | "rate_limited" | "error";
  errorMessage?: string;
}): Promise<void> {
  try {
    const sb = await getSupabaseServer();
    await sb.from("llm_calls").insert({
      user_id: params.userId,
      song_id: params.songId ?? null,
      call_type: params.callType,
      provider: params.provider,
      model: params.model ?? defaultModel(params.provider),
      tokens_in: params.tokensIn ?? null,
      tokens_out: params.tokensOut ?? null,
      latency_ms: params.latencyMs ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // logging never interrupts the main flow
  }
}
