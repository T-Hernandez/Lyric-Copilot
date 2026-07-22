const SYSTEM_PROMPT = `Eres un asistente de edición de letras de canciones. Tu tarea es reescribir un fragmento dado conservando la coherencia con el resto de la canción.

Reglas estrictas:
1. Mantén la extensión aproximada del fragmento original (± 20% de líneas).
2. Conserva el idioma del original.
3. Responde SOLO con el fragmento reescrito. Sin explicaciones, sin comillas, sin etiquetas de sección.
4. NUNCA reproduzcas letras reales de otros artistas.`;

export function buildRewritePrompt(input: {
  selectedText: string;
  instruction?: string | null;
  genre?: string | null;
  mood?: string | null;
}): { systemPrompt: string; userPrompt: string } {
  const parts: string[] = [];

  parts.push(`Fragmento a reescribir:\n<fragmento>\n${input.selectedText}\n</fragmento>`);

  const context: string[] = [];
  if (input.genre) context.push(`Género: ${input.genre}`);
  if (input.mood) context.push(`Mood: ${input.mood}`);
  if (context.length) parts.push(context.join(" | "));

  if (input.instruction?.trim()) {
    parts.push(`Instrucción: ${input.instruction.trim()}`);
  }

  parts.push("Reescribe este fragmento.");

  return { systemPrompt: SYSTEM_PROMPT, userPrompt: parts.join("\n\n") };
}
