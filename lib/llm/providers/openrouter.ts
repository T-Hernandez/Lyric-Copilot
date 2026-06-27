type LLMParams = { systemPrompt: string; userPrompt: string };

export async function generateWithOpenRouter({ systemPrompt, userPrompt }: LLMParams): Promise<string> {
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
    }),
  });

  if (res.status === 429) {
    const err = Object.assign(new Error("OpenRouter rate limited"), { status: 429 });
    throw err;
  }
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
