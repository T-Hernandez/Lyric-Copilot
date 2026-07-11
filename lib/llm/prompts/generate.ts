import { type WritingStrength, STRENGTH_LABELS } from "@/lib/catalog/writing-strengths";

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
9. Cuida la gramática: concordancia de género, número y conjugación verbal. Las canciones pueden ser coloquiales pero no deben tener errores gramaticales obvios.
10. Marca las secciones con etiquetas: [Intro], [Verso 1], [Verso 2], [Pre-coro], [Coro], [Puente], [Outro].
11. NUNCA reproduzcas, cites ni parafrasees letras reales de ningún artista existente.
12. Cuando se especifiquen técnicas de escritura: aplícalas para dar forma al enfoque emocional, la estructura y el vocabulario de la letra. Los artistas de referencia calibran el registro del género. Nunca imites un estilo específico: integra las técnicas al servicio de la canción. Las reglas 1-9 aplican siempre.
13. Responde SOLO con la letra. Sin explicaciones, sin comentarios antes ni después.`;

export type ArtistProfile = {
  artistName: string;
  writingStrengths: WritingStrength[] | null;
  legacyTraits?: Record<string, string> | null;
};

/** @deprecated Use ArtistProfile instead */
export type StyleTraitEntry = {
  artistName: string;
  traits: Record<string, string>;
};

function synthesizeStyles(artists: ArtistProfile[]): string {
  const modern = artists.filter((a) => a.writingStrengths?.length);
  const legacy = artists.filter((a) => !a.writingStrengths?.length);

  const parts: string[] = [];

  if (modern.length) {
    const counts = new Map<WritingStrength, number>();
    for (const artist of modern) {
      for (const s of artist.writingStrengths!) {
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    parts.push("Técnicas de escritura a priorizar:");

    if (modern.length === 1) {
      for (const [s] of sorted) {
        parts.push(`• ${STRENGTH_LABELS[s]}`);
      }
    } else {
      const high = sorted.filter(([, c]) => c >= 2);
      const medium = sorted.filter(([, c]) => c < 2);

      if (high.length) {
        parts.push("Prioridad alta (compartidas por múltiples referencias):");
        for (const [s] of high) parts.push(`  • ${STRENGTH_LABELS[s]}`);
      }
      if (medium.length) {
        parts.push("Complementarias:");
        for (const [s] of medium) parts.push(`  • ${STRENGTH_LABELS[s]}`);
      }
    }

    parts.push(`\nReferencias: ${modern.map((a) => a.artistName).join(", ")}`);
    parts.push("Calibra el registro de género y la estructura basándote en estos artistas.");
  }

  if (legacy.length) {
    if (parts.length) parts.push("");
    parts.push(
      "Referencias de estilo — adapta solo el esquema de rima, la estructura y el vocabulario del género. Las reglas 1-9 siguen activas:"
    );
    for (const artist of legacy) {
      const t = artist.legacyTraits;
      if (!t) {
        parts.push(`- ${artist.artistName}`);
        continue;
      }
      const lines = [`- ${artist.artistName}:`];
      if (t.rhyme_scheme) lines.push(`  Rima: ${t.rhyme_scheme}`);
      if (t.vocabulary) lines.push(`  Vocabulario: ${t.vocabulary}`);
      if (t.structure) lines.push(`  Estructura: ${t.structure}`);
      if (t.notes) lines.push(`  Notas: ${t.notes}`);
      parts.push(lines.join("\n"));
    }
  }

  return parts.join("\n");
}

export function buildGeneratePrompt(input: {
  theme?: string | null;
  genre?: string | null;
  mood?: string | null;
  language: string;
  styleReferences?: ArtistProfile[];
}): { systemPrompt: string; userPrompt: string } {
  const parts: string[] = [];

  parts.push(`Idioma de la letra: ${input.language === "es" ? "Español" : "Inglés"}`);
  if (input.genre) parts.push(`Género musical: ${input.genre}`);
  if (input.mood) parts.push(`Mood / atmósfera: ${input.mood}`);
  if (input.theme) parts.push(`Tema o idea central: ${input.theme}`);

  if (input.styleReferences?.length) {
    const styleSection = synthesizeStyles(input.styleReferences);
    if (styleSection) parts.push(`\n${styleSection}`);
  }

  parts.push("\nEscribe una letra completa basada en estos parámetros.");

  return { systemPrompt: SYSTEM_PROMPT, userPrompt: parts.join("\n") };
}
