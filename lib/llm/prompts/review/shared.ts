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
  emotional: "¿Llega algo? ¿La emoción es real?",
  storytelling: "¿Hay una historia? ¿Hay progresión?",
  hook: "¿Se queda en la cabeza? ¿Es memorable?",
  lyrics: "Imágenes, rimas, palabras específicas",
  commercial: "¿Tiene oyente posible? ¿Dónde encaja?",
  full: "Las tres cosas más importantes",
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
