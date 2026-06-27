import { generateWithGemini } from "./providers/gemini";
import { generateWithGroq } from "./providers/groq";
import { generateWithOpenRouter } from "./providers/openrouter";
import { logLlmCall } from "@/lib/songs/usageLog";

const PROVIDERS = {
  gemini: generateWithGemini,
  groq: generateWithGroq,
  openrouter: generateWithOpenRouter,
} as const;

type ProviderName = keyof typeof PROVIDERS;

function getFallbackOrder(): ProviderName[] {
  const raw = process.env.LLM_FALLBACK_ORDER ?? "gemini,groq,openrouter";
  return raw.split(",").filter((p): p is ProviderName => p in PROVIDERS);
}

function isRateLimitError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 429
  );
}

export async function generateCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  userId: string;
  songId?: string;
  callType: "generate" | "rewrite";
}): Promise<string> {
  const order = getFallbackOrder();
  let lastError: unknown;

  for (const provider of order) {
    const startedAt = Date.now();
    try {
      const text = await PROVIDERS[provider]({
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
      });
      await logLlmCall({
        userId: params.userId,
        songId: params.songId,
        callType: params.callType,
        provider,
        status: "success",
        latencyMs: Date.now() - startedAt,
      }).catch(() => {});
      return text;
    } catch (err) {
      lastError = err;
      const isRateLimit = isRateLimitError(err);
      await logLlmCall({
        userId: params.userId,
        songId: params.songId,
        callType: params.callType,
        provider,
        status: isRateLimit ? "rate_limited" : "error",
        latencyMs: Date.now() - startedAt,
        errorMessage: String(err),
      }).catch(() => {});
      if (!isRateLimit) throw err;
      // rate limit → siguiente proveedor
    }
  }

  throw lastError ?? new Error("Todos los proveedores LLM fallaron");
}
