# Lyric Copilot

A workspace for songwriters where AI acts as editor, producer, and creative companion — not as a replacement.

---

## Why this product exists

Most AI songwriting tools focus on generating lyrics. Lyric Copilot focuses on something different: helping songwriters improve their own writing.

The assumption is that the best lyrics come from the artist, not from a model. What the artist needs is a structured way to reflect on their work, identify what's not landing, and iterate with intention.

That's what this project tries to build.

---

## The creative flow

```
New song
  ↓
Write (or generate as a starting point)
  ↓
Rewrite — inline bubble on any selected text
  ↓
Review — choose a perspective, get focused feedback
  ↓
Apply suggestion — opens rewrite with context pre-loaded
  ↓
Compare versions — diff + AI analysis of what changed
  ↓
Keep writing
```

Each tool feeds into the next. The intent was to build a workspace, not a feature list.

---

## Features

**Editor**
- TipTap-based lyric editor with structured section support (Intro, Verso, Pre-Coro, Coro, Puente, Outro)
- Inline AI rewrite: select any text, get a suggestion, accept or discard without leaving the editor
- Keyboard shortcut to save (`Ctrl+S` / `Cmd+S`)

**Generation**
- Full-song generation with streaming preview
- Context-aware: uses genre, mood, theme, and style references
- Converts plain text output into structured TipTap nodes

**Review (6 perspectives)**

Each perspective has its own system prompt and its own lens. They don't share a template.

| Perspective | Lens |
|---|---|
| Emotional Impact | Listener — does this make you feel something? |
| Storytelling | Narrative editor — is there a story? does it progress? |
| Hook | Pop producer — would someone remember this tomorrow? |
| Lyrics & Writing | Craft obsessive — every word, every image |
| Commercial Potential | A&R — who's the audience? where does this live? |
| Full Analysis | Trusted producer — the three most important things |

After every review, a contextual action button appears to take you directly into a rewrite with the feedback pre-loaded as the instruction.

**Version history**
- Every manual save creates a versioned snapshot
- AI generation also creates a version automatically
- Restore any version into the editor
- Compare any past version against the current state

**Version comparison**
- Line-by-line diff (LCS algorithm, no external library)
- "Analizar cambio con IA" — streams an honest take on what improved and what you might have traded away

**Style references**
- 8 curated artists with hand-written style traits (rhyme scheme, imagery, vocabulary, structure)
- Grouped by relevance when a genre and mood are selected: exact match → genre match → mood match → everything else
- Traits are passed to the generation prompt, not used to imitate — the goal is style, not reproduction

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Editor | TipTap |
| LLM | Gemini Flash → Groq → OpenRouter (fallback chain) |
| UI | Tailwind CSS + shadcn/ui |
| Language | TypeScript |

---

## Architecture decisions

**RLS from day one.** Every database query goes through Row Level Security policies. This made early development slightly slower but means the app can scale to multi-user without rewriting access logic.

**Section structure lives in TipTap JSON.** Song sections (Intro, Verso, Coro, etc.) are custom TipTap nodes stored directly in `tiptap_json`. There's no separate `sections` table. This avoids syncing two sources of truth and keeps the editor state authoritative.

**One system prompt per review perspective.** Each of the six review lenses has its own file in `lib/llm/prompts/review/`. They don't share a template. This makes individual lenses independently evolvable — improving `hook.ts` doesn't risk breaking `storytelling.ts`.

**LLM router with configurable fallback.** `LLM_FALLBACK_ORDER` in `.env.local` determines the provider order. If Gemini hits a quota limit, the router falls through to Groq, then OpenRouter. All three providers implement the same streaming interface.

**Streaming everywhere.** Generation, rewriting, reviewing, and comparing all use Server-Sent Events. The client never waits for a completed response — it renders progressively. This was a deliberate choice to make the AI feel present, not transactional.

**`textToTiptapJson` is shared.** The function that converts plain LLM output into structured TipTap JSON lives in `lib/songs/textToTiptapJson.ts`. Both the client (after streaming ends) and the server (when saving a generated version) use the same function, so what you see in the editor is exactly what gets saved.

---

## Getting started

**Prerequisites:** Node.js 18+, a Supabase project, and at least one LLM API key (Gemini, Groq, or OpenRouter).

**1. Clone and install**
```bash
git clone https://github.com/your-username/lyric-copilot.git
cd lyric-copilot
npm install
```

**2. Environment variables**

Create `.env.local` from this template:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM providers (at least one required)
LLM_PRIMARY_PROVIDER=gemini
LLM_FALLBACK_ORDER=gemini,groq,openrouter
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

**3. Database**

Run both migrations in your Supabase SQL editor, in order:
```
supabase/migrations/001_initial.sql
supabase/migrations/002_style_references_seed.sql
```

The second migration seeds the 8 curated style references. Skip it if you want to start with an empty catalog.

**4. Run**
```bash
npm run dev
```

---

## What's not built yet

- **Sonic influences** as a separate field from mood — the architecture supports it (`metadata.sonicInfluences` in the review API), the UI doesn't expose it yet
- **Emotional intent** separate from mood — same situation
- **Review history** — reviews are ephemeral today; storing them as part of the song's creative history would make the workspace much richer
- **Compare any two versions** — currently compares against the current editor state; comparing v1 vs v3 directly isn't supported
- **Collaborative editing** — the RLS foundation is there, the UI isn't
