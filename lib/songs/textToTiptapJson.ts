import type { SectionType } from "@/components/editor/extensions/SongSection";

const TAG_MAP: Record<string, SectionType> = {
  // Español
  "intro": "intro",
  "verso": "verse",
  "verso 1": "verse",
  "verso 2": "verse",
  "verso 3": "verse",
  "verso 4": "verse",
  "pre-coro": "prechorus",
  "pre coro": "prechorus",
  "precoro": "prechorus",
  "coro": "chorus",
  "estribillo": "chorus",
  "puente": "bridge",
  "outro": "outro",
  // Inglés (el LLM a veces los genera aunque se le pida español)
  "verse": "verse",
  "verse 1": "verse",
  "verse 2": "verse",
  "verse 3": "verse",
  "verse 4": "verse",
  "pre-chorus": "prechorus",
  "pre chorus": "prechorus",
  "prechorus": "prechorus",
  "chorus": "chorus",
  "hook": "chorus",
  "bridge": "bridge",
};

export function textToTiptapJson(text: string): object {
  const lines = text.split("\n");
  const content: object[] = [];
  let hasContent = false;

  for (const line of lines) {
    const tagMatch = line.match(/^\[([^\]]+)\]/);
    if (tagMatch) {
      const key = tagMatch[1].toLowerCase().trim();
      const sectionType = TAG_MAP[key];
      if (sectionType) {
        content.push({ type: "songSection", attrs: { sectionType } });
        hasContent = true;
        continue;
      }
    }
    const trimmed = line.trim();
    if (trimmed || hasContent) {
      content.push({
        type: "paragraph",
        content: trimmed ? [{ type: "text", text: trimmed }] : [],
      });
      if (trimmed) hasContent = true;
    }
  }

  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
