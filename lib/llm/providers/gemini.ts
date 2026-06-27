type LLMParams = { systemPrompt: string; userPrompt: string };

export async function generateWithGemini({ systemPrompt, userPrompt }: LLMParams): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
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

  if (res.status === 429) {
    const err = Object.assign(new Error("Gemini rate limited"), { status: 429 });
    throw err;
  }
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
