type LLMParams = { systemPrompt: string; userPrompt: string };

async function* readSSEChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        const json = JSON.parse(raw);
        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text) yield text;
      } catch {
        // ignore malformed events
      }
    }
  }
}

export async function* generateWithGemini({ systemPrompt, userPrompt }: LLMParams): AsyncGenerator<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${key}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
      }),
    }
  );

  if (res.status === 429) throw Object.assign(new Error("Gemini rate limited"), { status: 429 });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

  yield* readSSEChunks(res.body!);
}
