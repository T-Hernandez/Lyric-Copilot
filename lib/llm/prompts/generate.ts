const SYSTEM_PROMPT = `Eres un asistente de escritura de canciones. Tu trabajo es ayudar a escribir letras originales que conserven la voz artística del usuario.

Reglas estrictas:
1. NUNCA reproduzcas, cites ni parafrasees letras reales de ningún artista existente.
2. Cuando se mencionen artistas de referencia, úsalos solo como guía de ESTILO (rima, vocabulario, estructura, tono).
3. El tema, idioma y mood del usuario tienen prioridad sobre cualquier referencia de estilo.
4. Mantén coherencia de rima, métrica aproximada y persona narrativa a lo largo de toda la letra.
5. Marca las secciones con etiquetas simples: [Intro], [Verso 1], [Verso 2], [Pre-coro], [Coro], [Puente], [Outro].
6. Responde SOLO con la letra. Sin explicaciones, sin comentarios antes ni después.`;

export type StyleTraitEntry = {
  artistName: string;
  traits: {
    rhyme_scheme?: string;
    imagery?: string;
    vocabulary?: string;
    structure?: string;
    notes?: string;
  };
};

export function buildGeneratePrompt(input: {
  theme?: string | null;
  genre?: string | null;
  mood?: string | null;
  language: string;
  styleReferences?: StyleTraitEntry[];
}): { systemPrompt: string; userPrompt: string } {
  const parts: string[] = [];

  parts.push(`Idioma de la letra: ${input.language === "es" ? "Español" : "Inglés"}`);
  if (input.genre) parts.push(`Género musical: ${input.genre}`);
  if (input.mood) parts.push(`Mood / atmósfera: ${input.mood}`);
  if (input.theme) parts.push(`Tema o idea central: ${input.theme}`);

  if (input.styleReferences?.length) {
    parts.push("\nReferencias de estilo (usa su ESTILO solamente, nunca sus letras reales):");
    for (const ref of input.styleReferences) {
      const lines: string[] = [`- ${ref.artistName}:`];
      if (ref.traits.rhyme_scheme) lines.push(`  Rima: ${ref.traits.rhyme_scheme}`);
      if (ref.traits.imagery) lines.push(`  Imágenes: ${ref.traits.imagery}`);
      if (ref.traits.vocabulary) lines.push(`  Vocabulario: ${ref.traits.vocabulary}`);
      if (ref.traits.structure) lines.push(`  Estructura: ${ref.traits.structure}`);
      if (ref.traits.notes) lines.push(`  Notas: ${ref.traits.notes}`);
      parts.push(lines.join("\n"));
    }
  }

  parts.push("\nEscribe una letra completa basada en estos parámetros.");

  return { systemPrompt: SYSTEM_PROMPT, userPrompt: parts.join("\n") };
}
