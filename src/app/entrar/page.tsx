"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Aviso, Boton, Campo, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { mensajeError, rutaSegura } from "@/lib/utils";

const GOOGLE_ACTIVO = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const next = rutaSegura(params.get("next"));
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(params.get("error") ? "No se pudo iniciar sesión, intenta de nuevo" : "");

  const supabase = createClient();
  const regreso = () => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: regreso() },
    });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { error } = await supabase.auth.verifyOtp({ email: correo.trim(), token: codigo.trim(), type: "email" });
    setCargando(false);
    if (error) return setError("El código no es válido o ya caducó");
    router.replace(next);
  }

  async function conGoogle() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: regreso() } });
    if (error) setError(mensajeError(error));
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <div className="text-4xl">🎁</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {paso === "correo" ? "Entra a SANTAGIFTS" : "Revisa tu correo"}
        </h1>
        <p className="text-sm text-stone-500">
          {paso === "correo" ? "Te mandamos un código, sin contraseñas." : `Escribe el código que mandamos a ${correo}`}
        </p>
      </div>

      {error ? <Aviso>{error}</Aviso> : null}

      {paso === "correo" ? (
        <>
          {GOOGLE_ACTIVO ? (
            <>
              <Boton variante="secundario" className="w-full" onClick={conGoogle} type="button">
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                  <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                </svg>
                Continuar con Google
              </Boton>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                <span className="h-px flex-1 bg-stone-200" />o<span className="h-px flex-1 bg-stone-200" />
              </div>
            </>
          ) : null}
          <form onSubmit={enviarCodigo} className="space-y-4">
            <Campo etiqueta="Correo">
              <Entrada
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="tu@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </Campo>
            <Boton className="w-full" cargando={cargando}>
              Mandarme el código
            </Boton>
          </form>
        </>
      ) : (
        <form onSubmit={verificar} className="space-y-4">
          <Entrada
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            pattern="[0-9]{6,10}"
            maxLength={10}
            placeholder="123456"
            className="text-center font-mono text-2xl tracking-[0.4em]"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <Boton className="w-full" cargando={cargando}>
            Entrar
          </Boton>
          <Boton variante="fantasma" type="button" className="w-full" onClick={() => setPaso("correo")}>
            Usar otro correo
          </Boton>
        </form>
      )}
    </div>
  );
}

export default function EntrarPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 items-center px-4 py-12">
      <Suspense>
        <Formulario />
      </Suspense>
    </main>
  );
}
