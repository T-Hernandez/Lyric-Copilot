export type ReviewLens =
  | "emotional"
  | "storytelling"
  | "hook"
  | "lyrics"
  | "commercial"
  | "full";

export type ReviewMetadata = {
  genre?: string;
  emotionalIntent?: string;
  sonicInfluences?: string[];
};

export const LENS_LABELS: Record<ReviewLens, string> = {
  emotional: "Impacto emocional",
  storytelling: "Storytelling",
  hook: "Hook",
  lyrics: "Letra y escritura",
  commercial: "Potencial comercial",
  full: "Análisis completo",
};

export const LENS_DESCRIPTIONS: Record<ReviewLens, string> = {
  emotional: "¿La emoción es específica o podría ser de cualquiera?",
  storytelling: "¿El oyente sabe dónde está al final de la canción?",
  hook: "¿Hay una frase que alguien querría repetir mañana?",
  lyrics: "¿Qué palabra sobra? ¿Cuál sorprende?",
  commercial: "¿Tiene un oyente concreto? ¿Dónde viviría esta canción?",
  full: "Las tres cosas que más cambiarían el resultado.",
};

export const LENS_REWRITE: Record<ReviewLens, { label: string; instruction: string }> = {
  emotional: {
    label: "Trabajar la emoción",
    instruction: "Hazlo más emotivo y auténtico. La emoción tiene que ser específica, no genérica.",
  },
  storytelling: {
    label: "Mejorar la narrativa",
    instruction: "Mejora la progresión de la historia. Que haya un punto A y un punto B claros.",
  },
  hook: {
    label: "Trabajar el hook",
    instruction: "Simplifica y fortalece el hook. Que sea fácil de recordar después de escucharlo una vez.",
  },
  lyrics: {
    label: "Mejorar la escritura",
    instruction: "Mejora la escritura línea a línea. Imágenes más específicas, palabras que sorprendan.",
  },
  commercial: {
    label: "Enfocar la propuesta",
    instruction: "Hazlo más enfocado en un oyente concreto. Que la propuesta sea más clara desde el primer verso.",
  },
  full: {
    label: "Aplicar el feedback",
    instruction: "Aplica las observaciones más importantes del análisis. Prioriza lo que más impacta.",
  },
};

export function buildUserPrompt(
  lyrics: string,
  metadata: ReviewMetadata
): string {
  const parts: string[] = [];
  if (metadata.genre) parts.push(`Género: ${metadata.genre}`);
  if (metadata.emotionalIntent) parts.push(`Intención emocional: ${metadata.emotionalIntent}`);
  if (metadata.sonicInfluences?.length)
    parts.push(`Influencias: ${metadata.sonicInfluences.join(", ")}`);

  const context = parts.length ? `Contexto: ${parts.join(" | ")}\n\n` : "";
  return `${context}Letra:\n${lyrics}`;
}
