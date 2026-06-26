import { Node, mergeAttributes } from "@tiptap/core";

export type SectionType = "intro" | "verse" | "prechorus" | "chorus" | "bridge" | "outro";

export const SECTION_LABELS: Record<SectionType, string> = {
  intro: "Intro",
  verse: "Verso",
  prechorus: "Pre-Coro",
  chorus: "Coro",
  bridge: "Puente",
  outro: "Outro",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    songSection: {
      insertSongSection: (sectionType: SectionType) => ReturnType;
    };
  }
}

export const SongSection = Node.create({
  name: "songSection",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      sectionType: {
        default: "verse" as SectionType,
        parseHTML: (el) => el.getAttribute("data-section-type") as SectionType,
        renderHTML: (attrs) => ({ "data-section-type": attrs.sectionType }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="song-section"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "song-section" })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "song-section");
      dom.setAttribute("contenteditable", "false");

      const sectionType = node.attrs.sectionType as SectionType;
      const label = SECTION_LABELS[sectionType] ?? sectionType;
      dom.textContent = label.toUpperCase();

      return { dom };
    };
  },

  addCommands() {
    return {
      insertSongSection:
        (sectionType: SectionType) =>
        ({ commands }) => {
          return commands.insertContent([
            { type: this.name, attrs: { sectionType } },
            { type: "paragraph" },
          ]);
        },
    };
  },
});
