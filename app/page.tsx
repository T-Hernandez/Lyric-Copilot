import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const STEPS = [
  { n: "01", title: "Escribe", desc: "Empieza desde una idea o genera un borrador con IA." },
  { n: "02", title: "Pide feedback", desc: "Recibe análisis específico sobre tu letra: hook, emoción, cohesión." },
  { n: "03", title: "Reescribe", desc: "Cambia lo que no funciona, línea por línea, manteniendo tu voz." },
  { n: "04", title: "Compara", desc: "Mira cómo evolucionó tu canción versión por versión." },
];

const COMPARISON = [
  ["Escriben por ti", "Escribe contigo"],
  ["Un solo resultado", "Versiones y evolución"],
  ["Generar", "Mejorar"],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg tracking-tight">Lyric Copilot</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Iniciar sesión
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: "sm" })}
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-4 py-20 max-w-3xl mx-auto w-full">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-6" style={{ textWrap: "balance" }}>
            No reemplaces tu creatividad.
            <br />
            Perfecciónala.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-10">
            La mayoría de las herramientas de IA generan letras.
            Lyric Copilot te ayuda a mejorar las tuyas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Empezar a escribir
            </Link>
            <a href="#como-funciona" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Ver cómo funciona
            </a>
          </div>
        </section>

        {/* Diferenciador */}
        <section className="border-y bg-muted/30 px-4 py-12 text-center">
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Las mejores canciones rara vez nacen en el primer intento.
            Nacen de escribir, recibir buen feedback y volver a intentarlo.
          </p>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="px-4 py-20 max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-semibold text-center mb-3">Cómo funciona</h2>
          <p className="text-center text-sm text-muted-foreground mb-14">
            Un flujo diseñado para hacer mejor tu canción, no para reemplazarla.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="space-y-3">
                <div className="w-8 h-8 rounded-full border border-primary/20 bg-primary/8 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary tabular-nums">{n}</span>
                </div>
                <h3 className="font-medium">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Por qué es diferente */}
        <section className="border-t bg-muted/20 px-4 py-20">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-10">Por qué es diferente</h2>
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-2 divide-x border-b bg-muted/40">
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Otras herramientas
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-medium text-primary uppercase tracking-wide">Lyric Copilot</p>
                </div>
              </div>
              {COMPARISON.map(([left, right], i) => (
                <div key={i} className="grid grid-cols-2 divide-x border-t">
                  <div className="px-4 py-3">
                    <p className="text-sm text-muted-foreground">{left}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium">{right}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 py-24 text-center">
          <h2 className="text-3xl font-bold mb-8">Empieza a escribir gratis.</h2>
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Crear cuenta
          </Link>
        </section>
      </main>

      <footer className="border-t px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Lyric Copilot</p>
      </footer>
    </div>
  );
}
