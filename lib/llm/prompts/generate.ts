import { type WritingStrength, STRENGTH_LABELS } from "@/lib/catalog/writing-strengths";

const SYSTEM_PROMPT = `Eres un compositor profesional. Tu trabajo es escribir letras originales que suenen como canciones reales — que alguien escuche y piense "esto lo escribió una persona", no una máquina.

Reglas de escritura:
1. La letra debe sonar como una canción real: estructura reconocible, un hook que invite a repetirse, versos que avancen la historia o la emoción.
2. Antes de escribir, elige una imagen concreta o emoción específica que recorra toda la canción. Todos los versos y el coro deben referir a ella, directa o indirectamente.
3. Esquema de rima: elige el que sirva mejor al género y la emoción — ABAB, ABCB, o cualquier otro. Las rimas aproximadas (slant rhymes) a menudo suenan más humanas que las perfectas. No fuerces una rima perfecta si el resultado suena artificial; una rima imperfecta con la palabra exacta vale más.
4. El coro es la parte más memorable: frases cortas, emoción directa. No más de 4-6 líneas. Escríbelo para que suene bien la segunda y la tercera vez.
5. Los versos desarrollan la historia o emoción. El coro la concentra. No los mezcles.
6. Varía el largo de los versos. Una línea corta después de una larga puede ser el momento más poderoso. La simetría perfecta verso a verso suena fabricada.
7. Ancla cada emoción en algo concreto: un objeto, un sonido, un lugar, una acción específica. "Manejé hasta tu casa a las dos de la mañana" suena más real que "fui hacia ti". "Me quedé mirando el techo" suena más real que "no pude dormir".
8. Evita estas frases — se perciben de inmediato como artificiales: alma que vuela / corazón que sangra / sombras del pasado / voces en mi cabeza / heridas que no cierran / el vacío que dejaste / ecos de tu voz / la tormenta interior. Si sientes la tentación de usarlas, reemplázalas con una imagen concreta que transmita lo mismo.
9. El narrador no necesita explicar todo. Puede insinuar, dejar incompleto, contradecirse — eso es lo que hacen las personas reales cuando hablan de algo que importa.
10. Usa lenguaje conversacional del género. Las canciones hablan como la gente, no como un libro. Coloquial no significa incorrecto: cuida la gramática y la concordancia.
11. Mantén la misma persona narrativa (1ª, 2ª o 3ª) a lo largo de toda la letra.
12. Marca las secciones con etiquetas: [Intro], [Verso 1], [Verso 2], [Pre-coro], [Coro], [Puente], [Outro].
13. NUNCA reproduzcas, cites ni parafrasees letras reales de ningún artista existente.
14. Cuando se especifiquen técnicas de escritura o directivas de artista: aplícalas — definen la voz, el registro y el enfoque emocional. Las reglas 1-11 aplican siempre.
15. Responde SOLO con la letra. Sin explicaciones, sin comentarios antes ni después.`;

export type ArtistProfile = {
  artistName: string;
  writingStrengths: WritingStrength[] | null;
  styleDirective?: string | null;
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

    const withDirectives = modern.filter((a) => a.styleDirective);
    if (withDirectives.length) {
      parts.push("\nCómo aplicar estas técnicas:");
      for (const a of withDirectives) {
        parts.push(`— ${a.artistName}: ${a.styleDirective}`);
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
