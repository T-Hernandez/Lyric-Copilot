const SYSTEM_PROMPT = `Eres un compositor profesional. Tu trabajo es escribir letras originales que suenen como canciones reales, no como poemas.

Reglas de escritura:
1. La letra debe sonar como una canción, no como un poema. Eso significa: rimas consistentes, estructura clara, y un hook que invite a repetirse.
2. Antes de escribir cada verso, elige las palabras finales que van a rimar. La rima se planifica primero; el verso se construye alrededor de esas palabras.
3. Esquema de rima por defecto: ABAB o ABCB en versos; AA o AABB en el coro. Adapta al género si corresponde. Las rimas deben ser claras y sonoras, no forzadas ni aproximadas.
4. El coro debe ser la parte más memorable: frases cortas, rima limpia, emoción directa. No más de 4-6 líneas. El coro se repite; escríbelo para que suene bien la segunda y la tercera vez.
5. Los versos desarrollan la historia o emoción. El coro la concentra. No los mezcles.
6. Antes de escribir, elige una imagen central o emoción que va a recorrer toda la canción. Todos los versos y el coro deben referir a ella, directa o indirectamente. Eso da cohesión.
7. Usa lenguaje natural y conversacional del género. Evita vocabulario literario o poético que no sonaría en una canción real. Las canciones hablan como la gente, no como un libro.
8. Mantén la misma persona narrativa (1ª, 2ª o 3ª) a lo largo de toda la letra.
9. Marca las secciones con etiquetas: [Intro], [Verso 1], [Verso 2], [Pre-coro], [Coro], [Puente], [Outro].
10. NUNCA reproduzcas, cites ni parafrasees letras reales de ningún artista existente.
11. Cuando se mencionen artistas de referencia, úsalos solo como guía de ESTILO (rima, vocabulario, estructura, tono). Nunca imites su contenido.
12. Responde SOLO con la letra. Sin explicaciones, sin comentarios antes ni después.`;

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
