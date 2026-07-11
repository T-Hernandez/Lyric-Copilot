export const STRENGTH_CATEGORIES = {
  narrative:   ["storytelling", "worldbuilding", "character", "dialogue"],
  language:    ["imagery", "symbolism", "wordplay", "minimalism"],
  emotion:     ["vulnerability", "introspection", "emotional_directness", "ambiguity"],
  musical:     ["hooks", "flow", "rhythm", "melody"],
  production:  ["production_synergy", "atmosphere"],
  perspective: ["political", "sensuality"],
} as const;

export const CATEGORY_LABELS: Record<keyof typeof STRENGTH_CATEGORIES, string> = {
  narrative:   "Narrativa",
  language:    "Lenguaje",
  emotion:     "Emoción",
  musical:     "Musicalidad",
  production:  "Producción",
  perspective: "Perspectiva",
};

export const WRITING_STRENGTHS = [
  "storytelling",
  "worldbuilding",
  "character",
  "dialogue",
  "imagery",
  "symbolism",
  "wordplay",
  "minimalism",
  "vulnerability",
  "introspection",
  "ambiguity",
  "political",
  "atmosphere",
  "rhythm",
  "melody",
  "flow",
  "production_synergy",
  "hooks",
  "sensuality",
  "emotional_directness",
] as const;

export type WritingStrength = (typeof WRITING_STRENGTHS)[number];

export const STRENGTH_LABELS: Record<WritingStrength, string> = {
  storytelling: "Narrativa",
  worldbuilding: "Construcción de mundo",
  character: "Personajes concretos",
  dialogue: "Voz conversacional / diálogo",
  imagery: "Imágenes sensoriales",
  symbolism: "Simbolismo",
  wordplay: "Juego de palabras",
  minimalism: "Minimalismo lírico",
  vulnerability: "Vulnerabilidad emocional",
  introspection: "Introspección",
  ambiguity: "Ambigüedad deliberada",
  political: "Perspectiva social o política",
  atmosphere: "Densidad atmosférica",
  rhythm: "Escritura rítmica",
  melody: "Composición melódica",
  flow: "Flow y cadencia",
  production_synergy: "Integración letra-sonido",
  hooks: "Construcción de estribillos",
  sensuality: "Sensualidad",
  emotional_directness: "Directness emocional",
};
