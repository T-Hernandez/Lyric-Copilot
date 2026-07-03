const SYSTEM_PROMPT = `Eres un compositor profesional. Tu trabajo es escribir letras originales que suenen como canciones reales, no como poemas.

Reglas de escritura:
1. La letra debe sonar como una canción, no como verso libre. Eso significa: rimas consistentes, estructura clara, y un hook que invite a repetirse.
2. Esquema de rima por defecto: ABAB o ABCB en versos; AA o AABB en el coro. Adapta al género si corresponde.
3. El coro debe ser la parte más memorable: frases cortas, rima limpia, emoción directa. No más de 4-6 líneas.
4. Los versos desarrollan la historia o emoción. El coro la concentra. No los mezcles.
5. Mantén la misma persona narrativa (1ª, 2ª o 3ª) a lo largo de toda la letra.
6. Marca las secciones con etiquetas: [Intro], [Verso 1], [Verso 2], [Pre-coro], [Coro], [Puente], [Outro].
7. NUNCA reproduzcas, cites ni parafrasees letras reales de ningún artista existente.
8. Cuando se mencionen artistas de referencia, úsalos solo como guía de ESTILO (rima, vocabulario, estructura, tono). Nunca imites su contenido.
9. Responde SOLO con la letra. Sin explicaciones, sin comentarios antes ni después.`;

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
