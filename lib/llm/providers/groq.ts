type LLMParams = { systemPrompt: string; userPrompt: string };

export async function generateWithGroq({ systemPrompt, userPrompt }: LLMParams): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 2048,
    }),
  });

  if (res.status === 429) {
    const err = Object.assign(new Error("Groq rate limited"), { status: 429 });
    throw err;
  }
  if (!res.ok) throw new Error(`Groq error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
