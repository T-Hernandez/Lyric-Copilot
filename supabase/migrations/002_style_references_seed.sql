-- =========================================================================
-- Seed inicial de referencias de estilo (8 artistas curados)
-- =========================================================================
insert into style_references (artist_name, genres, moods, languages, style_traits) values

(
  'Bad Bunny',
  array['Reggaeton', 'Trap Latino', 'Urban'],
  array['Energético', 'Festivo', 'Melancólico'],
  array['es'],
  '{
    "rhyme_scheme": "Rima consonante directa con mucha rima interna y doble sentido; las sílabas finales se repiten para crear flow",
    "imagery": "Vida urbana nocturna, lujo aspiracional, Puerto Rico, relaciones casuales y orgullo boricua",
    "vocabulary": "Spanglish, slang caribeño (bicho, titi, nena), diminutivos, términos de calle coloquiales",
    "structure": "Verso corto de 4-8 líneas, hook inmensamente pegadizo que se repite, puente opcional melódico",
    "notes": "Ritmo sincopado, onomatopeyas, autocelebración mezclada con vulnerabilidad genuina; la letra puede ser tanto íntima como festiva en la misma canción"
  }'::jsonb
),

(
  'Rosalía',
  array['Flamenco Pop', 'Avant-garde', 'Urban'],
  array['Melancólico', 'Introspectivo', 'Romántico'],
  array['es'],
  '{
    "rhyme_scheme": "Rima asonante libre o sin rima; la melodía vocal importa más que la rima exacta; repetición de sílabas para efecto rítmico",
    "imagery": "Amor doloroso y visceral, referencias a Andalucía y el duende, el cuerpo como expresión emocional, poder femenino",
    "vocabulary": "Español coloquial moderno con giros flamencos y copla tradicional, inglés ocasional integrado",
    "structure": "Secciones asimétricas, copla o seguiriya tradicional fusionada con producción contemporánea, sin estructura pop estricta",
    "notes": "Emoción antes que técnica; repetición de palabras o frases cortas para intensidad; honestidad brutal sobre el deseo y el dolor"
  }'::jsonb
),

(
  'Taylor Swift',
  array['Pop', 'Folk', 'Country', 'Indie'],
  array['Nostálgico', 'Romántico', 'Melancólico', 'Alegre'],
  array['en'],
  '{
    "rhyme_scheme": "Rima consonante limpia, alternada ABAB o ABCB; el gancho rima perfectamente con el contexto emocional",
    "imagery": "Recuerdos específicos con nombres, fechas y lugares concretos; estaciones del año como metáfora emocional; objetos cotidianos que se vuelven símbolos",
    "vocabulary": "Coloquial íntimo, primera persona confesional; referencias a colores, ropa, habitaciones; palabras simples con gran carga emocional",
    "structure": "Verso narrativo - pre-coro que eleva tensión - coro catártico estructurado - bridge emocional con cambio de tono y perspectiva",
    "notes": "Storytelling cinematográfico con detalles muy específicos (no genéricos); la letra cuenta una historia completa; el bridge suele recontextualizar todo"
  }'::jsonb
),

(
  'Drake',
  array['Hip-Hop', 'R&B', 'Trap'],
  array['Introspectivo', 'Melancólico', 'Energético'],
  array['en'],
  '{
    "rhyme_scheme": "Multisílabas encadenadas, rima interna densa en cada línea; variaciones rítmicas del flow entre cantado y rapeado",
    "imagery": "Éxito material y emocional simultáneo, lealtad vs traición, relaciones ambivalentes, Toronto como identidad",
    "vocabulary": "AAVE (African American Vernacular), slang de Toronto, referencias a marcas y lugares específicos, introspección directa",
    "structure": "Verso largo narrando una situación o sentimiento en detalle, coro melódico como alivio emocional, segunda estrofa cambia de perspectiva",
    "notes": "Alterna vulnerabilidad genuina con confianza; confiesa inseguridades desde una posición de poder; el tono puede virar sin aviso"
  }'::jsonb
),

(
  'Soda Stereo',
  array['Rock', 'Rock Alternativo', 'New Wave'],
  array['Nostálgico', 'Melancólico', 'Introspectivo', 'Romántico'],
  array['es'],
  '{
    "rhyme_scheme": "Rima asonante libre; privilegia el flujo sonoro y la cadencia melódica sobre la rima exacta; a veces sin rima deliberada",
    "imagery": "Ciudad nocturna y alienante, deseo y distancia, fenómenos naturales como extensión emocional, tiempo y memoria",
    "vocabulary": "Español neutro con musicalidad, neologismos ocasionales, metáforas visuales y sensoriales, evita el slang",
    "structure": "Verso largo con tensión creciente, estribillo liberador que contrasta, puente contemplativo o ambiguo",
    "notes": "Ambiental y cinematográfico; la letra construye atmósfera más que cuenta una historia; la ambigüedad es intencional para que cada oyente proyecte su experiencia"
  }'::jsonb
),

(
  'Billie Eilish',
  array['Pop', 'Electrónica', 'Alternativo', 'Indie'],
  array['Melancólico', 'Introspectivo', 'Oscuro', 'Energético'],
  array['en'],
  '{
    "rhyme_scheme": "Rima suelta o interna, a veces sin rima deliberada para sonar natural y conversacional; las rimas llegan cuando menos se esperan",
    "imagery": "Oscuridad psicológica, inseguridades expuestas, pesadillas y disociación, relaciones de poder desequilibradas",
    "vocabulary": "Coloquial teen, inglés conversacional muy directo, onomatopeyas, comparaciones inesperadas que mezclan mundano con perturbador",
    "structure": "Verso susurrado e íntimo, pre-coro que construye tensión, coro que explota o se queda sorprendentemente quieto (subvierte expectativa)",
    "notes": "Honestidad brutal sobre salud mental; imágenes perturbadoras en tono casual; la quietud puede ser más impactante que la energía"
  }'::jsonb
),

(
  'J Balvin',
  array['Reggaeton', 'Urban Latino', 'Pop'],
  array['Alegre', 'Energético', 'Festivo', 'Romántico'],
  array['es'],
  '{
    "rhyme_scheme": "Rima directa y simple, repetición de frases como herramienta hipnótica; el ritmo del reggaeton dicta la estructura más que la narrativa",
    "imagery": "Celebración, movimiento del cuerpo, hedonismo aspiracional, colores vibrantes, fiesta y deseo",
    "vocabulary": "Español caribeño-colombiano, palabras cortas de alto impacto rítmico, frases de moda y slang urbano, referencias a lujo accesible",
    "structure": "Intro con gancho inmediato, verso corto de 4-6 líneas, coro que se graba en la mente, drops instrumentales entre secciones",
    "notes": "Energía festiva constante; minimalismo lírico con máximo impacto rítmico; la letra sirve al ritmo más que a la narrativa; lo pegadizo es el objetivo"
  }'::jsonb
),

(
  'Shakira',
  array['Pop', 'Rock', 'Pop Latino', 'Cumbia'],
  array['Romántico', 'Energético', 'Introspectivo', 'Melancólico'],
  array['es', 'en'],
  '{
    "rhyme_scheme": "Rima consonante pulida que fluye naturalmente con la melodía; el gancho rima con precisión quirúrgica",
    "imagery": "Amor intenso y salvaje, referencias al cuerpo y lo animal, la tierra, el fuego y el mar; venganza y liberación femenina",
    "vocabulary": "Español expresivo y colorido, metáforas del mundo natural y animal, dichos coloquiales latinoamericanos, fuerza y placer",
    "structure": "Verso narrativo emotivo - pre-coro que eleva energía - coro potente con gancho memorable - bridge de clímax emocional",
    "notes": "Contraste entre dulzura e intensidad salvaje; mezcla lo poético con lo directo; el cuerpo y la sensualidad como forma de expresión legítima y poderosa"
  }'::jsonb
);
