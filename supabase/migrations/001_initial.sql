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
    is_curated boolean default true,
    genres text[] not null default '{}',
    moods text[] not null default '{}',
    languages text[] default '{}',
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
    theme text,
    genre text,
    mood text,
    language text not null default 'es' check (language in ('es', 'en')),

    status text not null default 'draft' check (status in ('draft', 'generating', 'ready')),
    current_version_id uuid,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =========================================================================
-- Artistas de referencia usados en una canción (curados y/o custom)
-- =========================================================================
create table song_style_references (
    id uuid primary key default gen_random_uuid(),
    song_id uuid not null references songs(id) on delete cascade,
    style_reference_id uuid references style_references(id),
    custom_artist_name text,
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

    tiptap_json jsonb not null,
    plain_text text not null,
    content_hash text not null,

    change_summary text,
    created_by uuid references profiles(id),
    created_at timestamptz default now(),

    unique (song_id, version_number)
);

-- FK circular resuelta después de crear song_versions
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
    provider text not null,
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
alter table style_references enable row level security;

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

create policy "Anyone can read curated style references"
    on style_references for select
    using (true);

-- =========================================================================
-- Trigger: crear profile automáticamente al registrarse un usuario
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
