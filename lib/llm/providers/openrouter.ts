type LLMParams = { systemPrompt: string; userPrompt: string };

async function* readOpenAISSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
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
      if (raw === "[DONE]") return;
      try {
        const json = JSON.parse(raw);
        const text: string = json?.choices?.[0]?.delta?.content ?? "";
        if (text) yield text;
      } catch {
        // ignore malformed events
      }
    }
  }
}

export async function* generateWithOpenRouter({ systemPrompt, userPrompt }: LLMParams): AsyncGenerator<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://lyric-copilot.vercel.app",
      "X-Title": "Lyric Copilot",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (res.status === 429) throw Object.assign(new Error("OpenRouter rate limited"), { status: 429 });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

  yield* readOpenAISSE(res.body!);
}
