"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/songs");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:opacity-80 transition-opacity">
            Lyric Copilot
          </Link>
        </div>

        <div className="bg-background border rounded-xl shadow-sm px-8 py-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Iniciar sesión</h1>
            <p className="text-muted-foreground text-sm">
              Inicia sesión en tu cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vos@ejemplo.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            ¿No tienes cuenta?{" "}
            <Link href="/signup" className="text-foreground underline underline-offset-4">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
