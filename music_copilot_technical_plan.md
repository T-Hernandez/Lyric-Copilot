# Plan de Implementación Técnica
## Music Copilot — MVP: Asistente de Letras

**Versión:** 1.0
**Fecha:** Junio 2026
**Stack:** Next.js 14+ (App Router) · Supabase (Postgres, Auth, Storage) · Proveedor LLM con capa de abstracción (Gemini Flash / Groq / OpenRouter free, intercambiables) · TipTap · Vercel

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Stack Tecnológico y Justificación](#3-stack-tecnológico-y-justificación)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Superficie de API](#5-superficie-de-api)
6. [Diseño del Pipeline de IA](#6-diseño-del-pipeline-de-ia)
7. [Arquitectura del Editor (TipTap + Track Changes)](#7-arquitectura-del-editor-tiptap--track-changes)
8. [Versionado de Canciones](#8-versionado-de-canciones)
9. [Autenticación y Seguridad](#9-autenticación-y-seguridad)
10. [Estructura de Carpetas](#10-estructura-de-carpetas)
11. [Configuración de Entorno](#11-configuración-de-entorno)
12. [Observabilidad y Control de Cuotas](#12-observabilidad-y-control-de-cuotas)
13. [Estrategia de Testing](#13-estrategia-de-testing)
14. [Fases de Implementación](#14-fases-de-implementación)
15. [Riesgos y Mitigaciones](#15-riesgos-y-mitigaciones)
16. [Apéndice: Snippets de Código Clave](#16-apéndice-snippets-de-código-clave)

---

## 1. Resumen Ejecutivo

Este documento describe el plan técnico para construir **Music Copilot**, una aplicación web que ayuda a escribir letras de canciones con asistencia de IA, preservando el espíritu artístico y la voz personal del usuario. El MVP incluye:

- Un **editor de canciones** con secciones libres (el usuario define su propia estructura) y plantillas opcionales (verso/coro/puente/etc.).
- Un **wizard de generación desde cero**: el usuario elige tema, género, mood, idioma y artistas de referencia (curados o propios), y la IA genera una letra completa en streaming.
- **Edición inline asistida por IA**: el usuario selecciona una línea o estrofa existente, pide una reescritura, y ve el cambio resaltado tipo *track changes* para aceptar o rechazar.
- Un **catálogo de perfiles de estilo** curados por artista (rasgos de escritura, no letras reales) que se sugieren automáticamente según género/mood, combinables con artistas que el usuario escriba a mano.
- **Versionado** del texto de cada canción, con historial y posibilidad de volver a una versión anterior.
- Diseño preparado para escalar a **acordes, melodías, exportación a PDF** y multi-usuario, sin necesidad de rehacer la base.

El sistema arranca **sin costo de IA**: usa proveedores con cuota gratuita (Gemini Flash, Groq, o modelos `:free` de OpenRouter) detrás de una capa de abstracción, de forma que cambiar de proveedor o pasar a un modelo de pago en el futuro sea un cambio de configuración, no de código.

**Estimación de tiempo:** 6–9 semanas, trabajando solo/a o con ayuda puntual.

---

## 2. Arquitectura General

### 2.1 Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│   Next.js · React · TipTap · TailwindCSS · shadcn/ui            │
│   (nadie instala nada — todo corre en el navegador)              │
└──────────────┬──────────────────────────────────┬───────────────┘
               │ HTTPS                            │ SSE (streaming)
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js Route Handlers / Server Actions             │
│       Auth middleware · Streaming routes · Node runtime          │
└──────┬──────────────────┬──────────────────┬─────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
   ┌────────┐      ┌──────────────┐    ┌──────────────┐
   │Supabase│      │ LLM Router   │    │ Style Profile │
   │        │      │              │    │ Catalog       │
   │- Auth  │      │Gemini Flash  │    │ (Postgres)    │
   │- Pg DB │      │  → Groq      │    │ curado por    │
   │- RLS   │      │  → OR free   │    │ género/mood   │
   └────────┘      │ (fallback)   │    └──────────────┘
                    └──────────────┘
```

### 2.2 Flujo: generación desde cero (wizard)

```
Usuario abre "Nueva canción" → completa wizard
    │  (tema, género, mood, idioma, artistas sugeridos/propios)
    ▼
[Client] POST /api/songs → crea fila en `songs` (status: "draft")
    │
    ▼
[Client] POST /api/songs/:id/generate (SSE)
    │
    ▼
[Server] Construye prompt:
    │   - system prompt con reglas (no copiar letras reales, idioma, tono)
    │   - perfiles de estilo combinados (curados + custom)
    │   - parámetros del usuario (tema, estructura si aplica)
    ▼
[Server] Llama al LLM en modo streaming
    │
    ▼
[Server → Client] Chunks de texto vía SSE
    │
    ▼
[Client] TipTap renderiza el texto palabra por palabra
    │
    ▼
[Server] Al terminar: guarda `song_versions` (version 1)
```

### 2.3 Flujo: edición inline de una parte existente

```
Usuario selecciona una línea/estrofa en el editor
    │
    ▼
[Client] Abre menú contextual → "Pedir reescritura"
    │  (puede agregar instrucción: "más oscuro", "que rime con X", etc.)
    ▼
[Client] POST /api/songs/:id/rewrite (SSE) con: texto seleccionado,
    │       contexto de la canción completa, instrucción opcional
    ▼
[Server] LLM genera el reemplazo en streaming
    │
    ▼
[Client] El texto nuevo aparece resaltado (mark de "sugerencia")
    │       junto al texto original tachado
    ▼
Usuario hace clic en ✓ (aceptar) o ✗ (rechazar)
    │
    ▼
[Client] Si acepta: reemplaza el texto y dispara guardado de versión
```

### 2.4 Por qué esta arquitectura

- **Next.js full-stack**: un solo proyecto, streaming de SSE nativo vía Route Handlers, sin necesidad de un servidor separado.
- **Supabase**: Auth + Postgres + RLS desde el día 1, aunque el MVP sea de un solo usuario — evita reescribir el modelo de datos cuando se abra a más gente.
- **LLM Router con fallback**: dado que el plan es usar cuotas gratuitas, el sistema necesita poder cambiar de proveedor automáticamente si uno se queda sin cupo, sin que el usuario lo note.
- **No hay cola de jobs (Inngest, etc.)**: a diferencia de un pipeline de 5 llamadas como en otros proyectos, aquí cada operación es 1 sola llamada al LLM (generar o reescribir), así que un Route Handler con streaming es suficiente — no se necesita infraestructura de jobs en background para el MVP.

---

## 3. Stack Tecnológico y Justificación

### 3.1 Decisiones ya tomadas

| Componente | Elección |
|---|---|
| Framework | Next.js (App Router) |
| DB / Auth | Supabase (Postgres + RLS) |
| LLM (inicial) | Gemini Flash / Groq / OpenRouter `:free`, intercambiables |
| LLM (dev local opcional) | Ollama (solo en la máquina del desarrollador, nunca para el usuario final) |
| Editor | TipTap |
| Interacción de edición IA | Inline, tipo *track changes* |
| Generación desde cero | Wizard con formulario |
| Streaming | Sí, palabra por palabra (SSE) |
| Usuarios | Single-user al inicio, con Auth desde el día 1 para escalar |

### 3.2 Pendiente de confirmar (recomendado)

#### Proveedor LLM por defecto → **Gemini 2.5 Flash como primario, Groq como fallback**

- Gemini ofrece ~1,500 requests/día gratis, calidad multilingüe sólida — suficiente para uso personal o un grupo pequeño probando el MVP.
- Groq corre modelos abiertos (Llama 3.3, Qwen3) muy rápido y con cuota diaria alta — buen respaldo si Gemini se agota o para abaratar costos de generación larga.
- OpenRouter `:free` queda como tercera opción de respaldo, útil porque permite probar muchos modelos sin cambiar de proveedor.
- Todo esto vive detrás de una sola interfaz (`lib/llm/router.ts`), así que agregar/quitar proveedores es configuración, no reescritura.

#### Despliegue → **Vercel**

- Integración nativa con Next.js, streaming de Route Handlers sin configuración extra.
- Supabase se conecta por variables de entorno, sin pasos adicionales.

#### Librerías de soporte

| Propósito | Librería | Por qué |
|---|---|---|
| Editor enriquecido | `@tiptap/react` + extensiones core | Soporta nodos y marks custom, necesario para el modo *track changes* |
| Streaming SSE | API nativa de `ReadableStream` | Sin dependencias extra, soportado por Route Handlers |
| Validación de esquemas | `zod` | Validar inputs del wizard y outputs estructurados del LLM |
| Formularios | `react-hook-form` + `zod` | Wizard de generación con validación |
| UI | `shadcn/ui` + Tailwind | Componentes accesibles, fácil de personalizar |
| Hash de contenido (dedupe de versiones) | `crypto` (nativo de Node) | Evitar guardar versiones idénticas |
| Testing unitario | `vitest` | Rápido, buena integración con TS |
| Testing E2E | `playwright` | Cubre wizard, edición inline y versionado |

---

## 4. Modelo de Datos

Todas las tablas usan RLS de Supabase. Timestamps en `timestamptz`. IDs `uuid` con `gen_random_uuid()`.

### 4.1 Esquema

```sql
-- =========================================================================
-- Perfiles de usuario (extiende auth.users de Supabase)
-- =========================================================================
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    display_name text,
    preferred_language text default 'es' check (preferred_language in ('es', 'en')),
    created_at timestamptz default now()
);

-- =========================================================================
-- Catálogo curado de perfiles de estilo (NO contiene letras reales)
-- =========================================================================
create table style_references (
    id uuid primary key default gen_random_uuid(),
    artist_name text not null,
    is_curated boolean default true, -- false = agregado por un usuario como "custom" reusable
    genres text[] not null default '{}',
    moods text[] not null default '{}',
    languages text[] default '{}', -- idiomas en los que tiene sentido sugerirlo
    style_traits jsonb not null,
    -- style_traits ejemplo:
    -- {
    --   "rhyme_scheme": "rima libre, ocasional interna",
    --   "imagery": "metáforas políticas y sociales, paisajes",
    --   "vocabulary": "conversacional, narrativo",
    --   "structure": "estrofas largas, coro simple repetido",
    --   "notes": "tono introspectivo, segunda persona frecuente"
    -- }
    created_at timestamptz default now()
);

-- =========================================================================
-- Canciones (entidad principal)
-- =========================================================================
create table songs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,

    title text not null default 'Sin título',
    theme text, -- de qué trata, ingresado por el usuario
    genre text,
    mood text,
    language text not null default 'es' check (language in ('es', 'en')),

    status text not null default 'draft' check (status in ('draft', 'generating', 'ready')),
    current_version_id uuid, -- FK a song_versions, agregada después (evita ciclo)

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =========================================================================
-- Artistas de referencia usados en una canción (curados y/o custom)
-- =========================================================================
create table song_style_references (
    id uuid primary key default gen_random_uuid(),
    song_id uuid not null references songs(id) on delete cascade,
    style_reference_id uuid references style_references(id), -- null si es custom
    custom_artist_name text, -- usado cuando el usuario escribe un artista no catalogado
    source text not null check (source in ('curated_suggested', 'curated_manual', 'custom')),
    created_at timestamptz default now(),

    constraint one_reference_type check (
        (style_reference_id is not null and custom_artist_name is null) or
        (style_reference_id is null and custom_artist_name is not null)
    )
);

-- =========================================================================
-- Versiones del texto de la canción
-- =========================================================================
create table song_versions (
    id uuid primary key default gen_random_uuid(),
    song_id uuid not null references songs(id) on delete cascade,
    version_number integer not null,

    tiptap_json jsonb not null, -- contenido completo del editor
    plain_text text not null,   -- texto plano, usado para hash/dedupe y contexto al LLM
    content_hash text not null,

    change_summary text, -- ej: "Reescritura del coro", "Generación inicial"
    created_by uuid references profiles(id),
    created_at timestamptz default now(),

    unique (song_id, version_number)
);

alter table songs
    add constraint fk_current_version
    foreign key (current_version_id) references song_versions(id);

-- =========================================================================
-- Log de llamadas al LLM (costos, cuotas, debugging)
-- =========================================================================
create table llm_calls (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    song_id uuid references songs(id) on delete set null,

    call_type text not null check (call_type in ('generate', 'rewrite')),
    provider text not null, -- 'gemini' | 'groq' | 'openrouter' | 'ollama'
    model text not null,

    tokens_in integer,
    tokens_out integer,
    latency_ms integer,
    status text not null check (status in ('success', 'rate_limited', 'error')),
    error_message text,

    created_at timestamptz default now()
);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table songs enable row level security;
alter table song_versions enable row level security;
alter table song_style_references enable row level security;
alter table llm_calls enable row level security;

create policy "Users manage their own songs"
    on songs for all
    using (auth.uid() = user_id);

create policy "Users access versions of their own songs"
    on song_versions for all
    using (song_id in (select id from songs where user_id = auth.uid()));

create policy "Users access style refs of their own songs"
    on song_style_references for all
    using (song_id in (select id from songs where user_id = auth.uid()));

create policy "Users see their own llm calls"
    on llm_calls for select
    using (auth.uid() = user_id);

-- style_references es catálogo compartido: lectura pública, escritura restringida (admin futuro)
alter table style_references enable row level security;
create policy "Anyone can read curated style references"
    on style_references for select
    using (true);
```

### 4.2 Notas de diseño

- **`style_traits` como JSONB**, no como texto libre: así el prompt builder puede combinar varios perfiles de forma estructurada (rima + vocabulario + estructura) en lugar de pegar párrafos sueltos.
- **Nunca se guardan letras reales** de ningún artista en `style_references` — solo descripciones de técnica, escritas por el equipo o derivadas de análisis de estilo público (entrevistas, crítica musical), nunca de las letras en sí.
- La estructura de secciones (verso/coro/puente) **no tiene tabla propia**: vive dentro de `tiptap_json` como atributos de nodo (ver sección 7). Esto evita sincronizar dos fuentes de verdad y es coherente con que la estructura es opcional y libre.

---

## 5. Superficie de API

Todas las rutas viven bajo `/api` como Route Handlers de Next.js. Las que generan contenido (`generate`, `rewrite`) devuelven `text/event-stream`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/songs` | Crea una canción (metadata del wizard) |
| `GET` | `/api/songs` | Lista canciones del usuario |
| `GET` | `/api/songs/:id` | Detalle + versión actual |
| `PATCH` | `/api/songs/:id` | Actualiza metadata (título, género, mood, etc.) |
| `DELETE` | `/api/songs/:id` | Elimina canción |
| `POST` | `/api/songs/:id/generate` | **SSE.** Genera letra completa desde el wizard |
| `POST` | `/api/songs/:id/rewrite` | **SSE.** Reescribe una sección/línea seleccionada |
| `GET` | `/api/songs/:id/versions` | Lista historial de versiones |
| `GET` | `/api/songs/:id/versions/:versionId` | Contenido de una versión específica |
| `POST` | `/api/songs/:id/versions` | Guarda una nueva versión manualmente |
| `POST` | `/api/songs/:id/versions/:versionId/restore` | Restaura una versión anterior como la actual |
| `GET` | `/api/style-references?genre=&mood=&language=` | Sugerencias curadas filtradas |
| `POST` | `/api/songs/:id/style-references` | Asocia un artista (curado o custom) a la canción |
| `DELETE` | `/api/songs/:id/style-references/:refId` | Quita un artista asociado |

---

## 6. Diseño del Pipeline de IA

### 6.1 Capa de abstracción del proveedor

```
lib/llm/
  router.ts        # decide qué proveedor usar, maneja fallback
  providers/
    gemini.ts
    groq.ts
    openrouter.ts
    ollama.ts       # solo dev local
  prompts/
    generate.ts     # construye el prompt de generación desde cero
    rewrite.ts       # construye el prompt de reescritura inline
```

`router.ts` intenta el proveedor primario; si recibe un error de rate limit (HTTP 429 o equivalente), pasa automáticamente al siguiente de la lista de fallback, registrando el intento en `llm_calls`. El usuario nunca ve esta lógica — desde su perspectiva, el texto simplemente empieza a aparecer.

### 6.2 Reglas del *system prompt* (aplican a generación y reescritura)

Estas reglas son la pieza más importante del diseño, porque es donde se resuelve "que no se sienta IA genérica" sin caer en reproducir obras de terceros:

1. Nunca citar, parafrasear cerca, o reproducir letras reales de ningún artista — los perfiles de estilo describen **técnica**, no contenido.
2. Usar los `style_traits` combinados (rima, imaginería, vocabulario, estructura) como guía de tono y forma, no como plantilla a copiar.
3. Priorizar el tema, idioma y mood que indicó el usuario por encima de cualquier perfil de estilo.
4. Mantener coherencia interna (rima, métrica aproximada, persona narrativa) a lo largo de toda la letra generada.
5. Si el usuario pidió una reescritura de una sección, mantener coherencia con el resto de la canción (se le pasa el texto completo como contexto, no solo la línea seleccionada).

### 6.3 Combinación de perfiles de estilo

```
Input del usuario:
  género: "folk", mood: "introspectivo", idioma: "es"
  artistas sugeridos por el sistema: [Bob Dylan, Silvio Rodríguez]
  el usuario acepta a Dylan, quita a Silvio Rodríguez, agrega "Joaquín Sabina" a mano

Prompt final combina:
  - style_traits de Bob Dylan (de la tabla style_references)
  - "Joaquín Sabina" como nombre libre (el LLM usa su propio conocimiento general
    del estilo de ese artista, ya que no está en el catálogo curado — se le indica
    explícitamente que describa el estilo en términos generales, no que cite letras)
  - tema, idioma y mood ingresados por el usuario
```

### 6.4 Streaming (Route Handler)

El flujo de generación devuelve un `ReadableStream` que el frontend consume token por token, actualizando el contenido de TipTap en tiempo real (ver snippet en sección 16.2). Al finalizar el stream, el servidor guarda automáticamente la primera versión en `song_versions`.

### 6.5 Salida estructurada vs. texto plano

Para el MVP, la generación devuelve **texto plano con marcado simple de secciones** (ej. `[Coro]`, `[Verso 1]`) en lugar de JSON estructurado — es más robusto en streaming (no hay que parsear JSON parcial) y el editor interpreta esas etiquetas para sugerir blocks de estructura. Pasar a salida estructurada (JSON) queda como mejora futura si se necesita mayor control.

---

## 7. Arquitectura del Editor (TipTap + Track Changes)

### 7.1 Nodos y marks personalizados

- **Nodo `songSection`**: bloque opcional con atributo `sectionType` (`verse` | `chorus` | `bridge` | `intro` | `outro` | `custom` | `none`). Por defecto, los párrafos no tienen tipo asignado (estructura libre); el usuario puede etiquetar una sección desde un menú flotante.
- **Mark `aiSuggestionInsert`**: envuelve el texto nuevo propuesto por la IA (se muestra subrayado/resaltado en verde).
- **Mark `aiSuggestionDelete`**: envuelve el texto original que sería reemplazado (se muestra tachado).
- **Componente flotante `SuggestionToolbar`**: aparece sobre una sugerencia activa con botones ✓ Aceptar / ✗ Rechazar.

### 7.2 Flujo de aceptación/rechazo

```
1. Usuario selecciona texto → "Pedir reescritura" (+ instrucción opcional)
2. Stream de respuesta llega → se inserta como nodo con mark `aiSuggestionInsert`,
   el texto original se envuelve en `aiSuggestionDelete` (no se borra todavía)
3. Usuario hace clic en ✓:
     - Se elimina el nodo con `aiSuggestionDelete`
     - Se remueve el mark `aiSuggestionInsert` del texto nuevo (queda como texto normal)
     - Se dispara guardado de nueva versión
4. Usuario hace clic en ✗:
     - Se elimina el nodo con `aiSuggestionInsert`
     - Se remueve el mark `aiSuggestionDelete` del texto original (vuelve a la normalidad)
```

Este patrón es deliberadamente simple (vs. un sistema completo de tracked changes multi-usuario) porque el MVP es de un solo editor a la vez — evita la complejidad de resolución de conflictos que sí necesitaría un editor colaborativo en tiempo real.

---

## 8. Versionado de Canciones

- Cada vez que se acepta una sugerencia de IA, se termina una generación desde cero, o el usuario guarda manualmente, se crea una fila en `song_versions`.
- **Dedupe por hash**: si el contenido no cambió respecto a la última versión, no se crea una nueva fila (mismo patrón de `content_hash` que evita ruido en el historial).
- La UI de historial muestra `change_summary` (ej. "Reescritura del coro", "Generación inicial") y permite previsualizar y restaurar cualquier versión anterior.
- Restaurar una versión **no borra el historial** — crea una nueva versión con el contenido restaurado, para no perder ningún estado intermedio.

---

## 9. Autenticación y Seguridad

- Supabase Auth con email/password (magic link como mejora futura opcional).
- RLS activado desde el día 1 en todas las tablas con `user_id`, aunque el producto se use con un solo usuario al principio — esto es lo que permite abrir a más usuarios después sin tocar el modelo de datos ni la lógica de negocio.
- Las claves de los proveedores LLM (`GEMINI_API_KEY`, `GROQ_API_KEY`, etc.) viven solo en el servidor (variables de entorno de Vercel), nunca se exponen al cliente.
- Disclaimer visible en la UI: el contenido generado es una sugerencia creativa; el usuario es responsable de cualquier verificación de derechos de autor si decide publicar la canción comercialmente.

---

## 10. Estructura de Carpetas

```
music-copilot/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── songs/
│   │   │   ├── page.tsx                  # lista de canciones
│   │   │   ├── new/page.tsx              # wizard de generación
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # editor principal
│   │   │       └── history/page.tsx      # historial de versiones
│   ├── api/
│   │   ├── songs/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── generate/route.ts     # SSE
│   │   │       ├── rewrite/route.ts      # SSE
│   │   │       ├── versions/route.ts
│   │   │       └── style-references/route.ts
│   │   └── style-references/route.ts
├── components/
│   ├── editor/
│   │   ├── SongEditor.tsx
│   │   ├── extensions/
│   │   │   ├── SongSection.ts
│   │   │   └── AiSuggestionMark.ts
│   │   └── SuggestionToolbar.tsx
│   ├── wizard/
│   │   ├── SongWizard.tsx
│   │   └── StyleReferencePicker.tsx
│   └── ui/                                # shadcn/ui
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── llm/
│   │   ├── router.ts
│   │   ├── providers/
│   │   └── prompts/
│   └── songs/
│       ├── versioning.ts
│       └── styleProfiles.ts
├── prompts/
│   └── system/
│       ├── generate.es.ts
│       └── rewrite.es.ts
└── supabase/
    └── migrations/
```

---

## 11. Configuración de Entorno

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Proveedor LLM primario y orden de fallback
LLM_PRIMARY_PROVIDER=gemini        # gemini | groq | openrouter | ollama
LLM_FALLBACK_ORDER=gemini,groq,openrouter

GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=

# Solo desarrollo local (nunca en producción)
OLLAMA_BASE_URL=http://localhost:11434
USE_OLLAMA_IN_DEV=false
```

---

## 12. Observabilidad y Control de Cuotas

Como el MVP arranca sobre cuotas gratuitas, el control de uso es más importante que en un proyecto con presupuesto de API:

- Cada llamada queda registrada en `llm_calls` (proveedor, modelo, tokens, latencia, si fue rate-limited).
- Un endpoint interno (`/api/admin/usage`, protegido) resume el consumo del día por proveedor, para saber cuándo se está cerca del límite gratuito.
- Si el proveedor primario devuelve un error de cuota, el router cambia automáticamente al siguiente — esto se loguea como `status: 'rate_limited'` para tener visibilidad, aunque el usuario no vea ningún error.
- Alerta simple (log o email manual, no es prioridad de automatizar en el MVP) si todos los proveedores de la lista de fallback se agotan en el mismo día.

---

## 13. Estrategia de Testing

| Tipo | Herramienta | Cobertura |
|---|---|---|
| Unitario | `vitest` | Prompt builders, combinación de `style_traits`, hash de versiones, lógica del router de fallback |
| Integración | `vitest` + mocks de proveedor | Que el router efectivamente cambie de proveedor ante un 429 simulado |
| E2E | `playwright` | Wizard completo (crear canción → generar → ver streaming), edición inline (seleccionar → reescribir → aceptar/rechazar), historial (guardar versión → restaurar) |

---

## 14. Fases de Implementación

| Fase | Contenido | Estimado |
|---|---|---|
| 0 | Setup: proyecto Next.js, Supabase, migraciones, Auth básico | 3-4 días |
| 1 | CRUD de canciones + editor TipTap básico (sin IA, estructura libre + plantillas) | 1 semana |
| 2 | Integración LLM (sin streaming todavía): wizard → generación completa de una vez | 1 semana |
| 3 | Streaming SSE en generación + UI palabra por palabra | 4-5 días |
| 4 | Catálogo de `style_references` (seed inicial de artistas curados) + selector en el wizard | 4-5 días |
| 5 | Edición inline con IA: selección → reescritura → marks de track changes → aceptar/rechazar | 1-1.5 semanas |
| 6 | Versionado: guardado automático, historial, restaurar | 4-5 días |
| 7 | LLM Router con fallback multi-proveedor + logging de cuotas | 3-4 días |
| 8 | Testing, pulido de UI, despliegue en Vercel | 4-5 días |

**Total estimado: 6-9 semanas** trabajando part-time/solo.

---

## 15. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Se agota la cuota gratuita del proveedor primario | Media | Media | Router con fallback automático a 2-3 proveedores gratuitos distintos |
| El streaming se corta a mitad de generación | Media | Media | Guardar progreso parcial en estado local; permitir "continuar generación" si el stream se interrumpe |
| Las sugerencias de estilo se sienten genéricas a pesar del catálogo | Media | Alta | Iterar el `system prompt` y los `style_traits` con pruebas reales tempranas (Fase 4), no esperar al final |
| Complejidad de marks custom en TipTap/ProseMirror | Alta | Media | Dedicar tiempo de spike en Fase 5 antes de comprometerse a fechas; empezar con el caso simple (un solo bloque de reemplazo) |
| Confusión sobre derechos de autor de las letras generadas | Baja | Alta | Disclaimer claro en la UI; el sistema nunca reproduce letras reales, solo describe técnica de estilo |
| El catálogo curado de artistas queda chico rápido | Alta | Baja | Diseñado para crecer fácil (tabla simple); agregar más perfiles es trabajo de contenido, no de código |
| Necesidad futura de multi-usuario real (compartir canciones, colaborar) | Baja (para el MVP) | Media | RLS y `user_id` ya están desde el día 1, así que escalar no requiere migración de datos |

---

## 16. Apéndice: Snippets de Código Clave

### 16.1 Router de proveedores LLM con fallback

```typescript
// lib/llm/router.ts
import { generateWithGemini } from "./providers/gemini";
import { generateWithGroq } from "./providers/groq";
import { generateWithOpenRouter } from "./providers/openrouter";
import { logLlmCall } from "@/lib/songs/usageLog";

const PROVIDERS = {
  gemini: generateWithGemini,
  groq: generateWithGroq,
  openrouter: generateWithOpenRouter,
} as const;

type ProviderName = keyof typeof PROVIDERS;

const FALLBACK_ORDER = (process.env.LLM_FALLBACK_ORDER ?? "gemini,groq,openrouter")
  .split(",") as ProviderName[];

export async function* streamCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  userId: string;
  songId?: string;
  callType: "generate" | "rewrite";
}) {
  let lastError: unknown;

  for (const provider of FALLBACK_ORDER) {
    try {
      const stream = PROVIDERS[provider]({
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
      });

      for await (const chunk of stream) {
        yield chunk;
      }

      await logLlmCall({ ...params, provider, status: "success" });
      return;
    } catch (err) {
      lastError = err;
      const isRateLimit = isRateLimitError(err);
      await logLlmCall({
        ...params,
        provider,
        status: isRateLimit ? "rate_limited" : "error",
        errorMessage: String(err),
      });
      if (!isRateLimit) throw err; // error real, no tiene sentido seguir probando
      // si fue rate limit, sigue al próximo proveedor del loop
    }
  }

  throw lastError ?? new Error("Todos los proveedores LLM fallaron");
}

function isRateLimitError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status: number }).status === 429
  );
}
```

### 16.2 Route Handler de generación (SSE)

```typescript
// app/api/songs/[id]/generate/route.ts
import { streamCompletion } from "@/lib/llm/router";
import { buildGeneratePrompt } from "@/lib/llm/prompts/generate";
import { getSupabaseServer } from "@/lib/supabase/server";
import { saveNewVersion } from "@/lib/songs/versioning";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json(); // { theme, genre, mood, language, styleReferenceIds, customArtists }
  const { systemPrompt, userPrompt } = await buildGeneratePrompt(body);

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamCompletion({
          systemPrompt,
          userPrompt,
          userId: user.id,
          songId: params.id,
          callType: "generate",
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }

        await saveNewVersion({
          songId: params.id,
          plainText: fullText,
          createdBy: user.id,
          changeSummary: "Generación inicial",
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 16.3 Construcción del prompt combinando perfiles de estilo

```typescript
// lib/llm/prompts/generate.ts
import { getSupabaseServer } from "@/lib/supabase/server";

const SYSTEM_PROMPT_BASE = `
Eres un asistente de escritura de canciones. Tu trabajo es ayudar a un usuario humano
a escribir letras originales que conserven su voz e intención artística.

Reglas estrictas:
1. NUNCA reproduzcas, cites o parafrasees de cerca letras reales de ningún artista existente.
2. Cuando se mencionen artistas de referencia, úsalos solo como guía de ESTILO
   (rima, vocabulario, estructura, tono) — nunca copies contenido real de sus canciones.
3. El tema, idioma y mood indicados por el usuario tienen prioridad sobre cualquier referencia de estilo.
4. Mantén coherencia de rima, métrica aproximada y persona narrativa a lo largo de toda la letra.
5. Marca las secciones con etiquetas simples como [Verso 1], [Coro], [Puente] cuando corresponda.
`;

export async function buildGeneratePrompt(input: {
  theme: string;
  genre: string;
  mood: string;
  language: "es" | "en";
  styleReferenceIds: string[];
  customArtists: string[];
}) {
  const sb = await getSupabaseServer();

  const { data: curatedProfiles } = await sb
    .from("style_references")
    .select("artist_name, style_traits")
    .in("id", input.styleReferenceIds);

  const curatedBlock = (curatedProfiles ?? [])
    .map((p) => `- ${p.artist_name}: ${JSON.stringify(p.style_traits)}`)
    .join("\n");

  const customBlock = input.customArtists.length
    ? `Artistas adicionales (sin perfil catalogado, usa tu conocimiento general de su ESTILO,
       nunca de letras específicas): ${input.customArtists.join(", ")}`
    : "";

  const userPrompt = `
Idioma de la letra: ${input.language}
Género: ${input.genre}
Mood: ${input.mood}
Tema/idea central: ${input.theme}

Referencias de estilo curadas:
${curatedBlock || "(ninguna)"}

${customBlock}

Escribe una letra completa basada en estos parámetros.
`.trim();

  return { systemPrompt: SYSTEM_PROMPT_BASE, userPrompt };
}
```

### 16.4 Guardado de versión con dedupe por hash

```typescript
// lib/songs/versioning.ts
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function saveNewVersion(params: {
  songId: string;
  plainText: string;
  tiptapJson?: object;
  createdBy: string;
  changeSummary: string;
}) {
  const sb = await getSupabaseServer();
  const contentHash = crypto.createHash("sha256").update(params.plainText).digest("hex");

  const { data: latest } = await sb
    .from("song_versions")
    .select("version_number, content_hash")
    .eq("song_id", params.songId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.content_hash === contentHash) {
    return { created: false, reason: "duplicate_content" };
  }

  const { data: version, error } = await sb
    .from("song_versions")
    .insert({
      song_id: params.songId,
      version_number: (latest?.version_number ?? 0) + 1,
      plain_text: params.plainText,
      tiptap_json: params.tiptapJson ?? { type: "doc", content: [] },
      content_hash: contentHash,
      change_summary: params.changeSummary,
      created_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  await sb
    .from("songs")
    .update({ current_version_id: version.id, updated_at: new Date().toISOString(), status: "ready" })
    .eq("id", params.songId);

  return { created: true, versionId: version.id };
}
```

---

## Fin del Documento

Este plan es un punto de partida, no un contrato. Es normal que algunos detalles cambien al chocar con la realidad de implementación — especialmente en torno a las extensiones custom de TipTap, el ajuste fino de los `style_traits` por artista, y el comportamiento real de las cuotas gratuitas en uso continuo.

**Próximos pasos sugeridos:**
1. Seedear el catálogo inicial de `style_references` con 8-10 artistas que realmente te interesen usar (esto es trabajo de contenido, conviene empezarlo en paralelo a Fase 0-1).
2. Crear el proyecto en Supabase y correr las migraciones de la sección 4.
3. Arrancar Fase 0.
4. Revisar el resultado real del prompt de generación (sección 6) apenas esté integrado el LLM — es más fácil ajustar las reglas de estilo temprano que al final.
