/**
 * Brief style directives per artist — sent to the model to operationalize
 * writing_strengths tokens. One directive per artist, max 2 sentences.
 * Keyed by exact artist_name value in the DB.
 */
export const ARTIST_DIRECTIVES: Record<string, string> = {
  "MF DOOM":
    "Usa rimas internas multisílabas que se encadenan dentro del verso, no solo al final de cada línea. El flujo puede romper el compás esperado; prioriza la textura sonora y el juego de palabras absurdo-denso sobre la regularidad de la rima.",

  "Kendrick Lamar":
    "Construye desde una voz narrativa fuerte con perspectiva crítica; el narrador puede desdoblarse en alter egos o voces múltiples. La profundidad lírica no sacrifica la claridad del mensaje central.",

  "Taylor Swift":
    "Ancla cada emoción en detalles específicos — un lugar, un objeto, una fecha concreta. El narrador cuenta la historia como si la viviera en tiempo real; el puente es el momento de mayor revelación emocional.",

  "Billie Eilish":
    "Habla en susurros: las confesiones más pesadas se dicen sin drama ni adornos. Usa imágenes cotidianas y extrañas al mismo tiempo; el verso puede fluir libremente si suena íntimo.",

  "Drake":
    "La vulnerabilidad se enuncia directamente, sin metáforas que la distancien. El narrador oscila entre la confianza y la inseguridad en el mismo verso; los hooks son simples y directos, diseñados para repetirse.",

  "Bad Bunny":
    "Mezcla orgullo y vulnerabilidad sin disculparse por el cambio de registro. El ritmo manda: las palabras siguen el groove más que la sintaxis perfecta.",

  "Rubén Blades":
    "Los personajes tienen nombre, historia y contexto social concreto; la narración es cinematográfica. Lo político emerge de lo personal, nunca al revés.",

  "Rosalía":
    "Ancla las imágenes en lo corporal y lo sensorial — piel, temperatura, textura. La repetición es deliberada y crea trance; el lenguaje puede mezclar registros coloquial y poético en el mismo verso.",

  "Soda Stereo":
    "La atmósfera importa más que la narrativa; las imágenes son evocadoras y abiertas, no explicadas. El verso puede terminar sin resolución: la ambigüedad es la conclusión.",

  "Porter Robinson":
    "El narrador habita un mundo propio con reglas propias. Las emociones se expresan mediante fragmentos líricos — imágenes de memoria, naturaleza o espacios digitales — más que mediante frases completas.",
};
