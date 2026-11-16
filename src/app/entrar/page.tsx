"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Aviso, Boton, Campo, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { mensajeError, rutaSegura } from "@/lib/utils";

const GOOGLE_ACTIVO = process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true";

type Modo = "entrar" | "crear" | "codigo" | "verificar" | "olvide";

function traducir(e: unknown) {
  const m = mensajeError(e).toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo con el enlace que te mandamos";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene cuenta. Entra con tu contraseña o con código";
  if (m.includes("password should be")) return "La contraseña debe tener al menos 8 caracteres";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Espera un momento antes de pedir otro correo";
  return mensajeError(e);
}

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const next = rutaSegura(params.get("next"));
  const [modo, setModo] = useState<Modo>("entrar");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(params.get("error") ? "No se pudo iniciar sesión, intenta de nuevo" : "");
  const [aviso, setAviso] = useState("");

  const regreso = (destino = next) => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(destino)}`;

  function cambiarModo(m: Modo) {
    setModo(m);
    setError("");
    setAviso("");
  }

  async function correr(accion: () => Promise<void>) {
    setError("");
    setAviso("");
    setCargando(true);
    try {
      await accion();
    } catch (e) {
      setError(traducir(e));
    } finally {
      setCargando(false);
    }
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    const email = correo.trim();

    correr(async () => {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
        if (error) throw error;
        router.replace(next);
      } else if (modo === "crear") {
        if (contrasena.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
        if (contrasena !== confirmar) throw new Error("Las contraseñas no coinciden");
        const { data, error } = await supabase.auth.signUp({
          email,
          password: contrasena,
          options: { emailRedirectTo: regreso() },
        });
        if (error) throw error;
        // Si Supabase pide confirmar el correo no hay sesión todavía
        if (data.session) router.replace(next);
        else setAviso(`Te mandamos un correo a ${email}. Toca el enlace para activar tu cuenta.`);
      } else if (modo === "codigo") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true, emailRedirectTo: regreso() },
        });
        if (error) throw error;
        setModo("verificar");
      } else if (modo === "verificar") {
        const { error } = await supabase.auth.verifyOtp({ email, token: codigo.trim(), type: "email" });
        if (error) throw new Error("El código no es válido o ya caducó");
        router.replace(next);
      } else if (modo === "olvide") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: regreso("/restablecer") });
        if (error) throw error;
        setAviso(`Si ${email} tiene cuenta, te llegará un correo para poner una contraseña nueva.`);
      }
    });
  };

  async function conGoogle() {
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: regreso() } });
    if (error) setError(traducir(error));
  }

  const titulos: Record<Modo, [string, string]> = {
    entrar: ["Entra a SANTAGIFTS", "Con tu correo y contraseña."],
    crear: ["Crea tu cuenta", "Solo necesitas tu correo y una contraseña."],
    codigo: ["Entrar sin contraseña", "Te mandamos un enlace o código a tu correo."],
    verificar: ["Revisa tu correo", `Toca el enlace o escribe el código que mandamos a ${correo}`],
    olvide: ["¿Olvidaste tu contraseña?", "Te mandamos un correo para poner una nueva."],
  };
  const textoBoton: Record<Modo, string> = {
    entrar: "Entrar",
    crear: "Crear cuenta",
    codigo: "Mandarme el correo",
    verificar: "Entrar",
    olvide: "Mandarme el correo",
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <div className="text-4xl">🎁</div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulos[modo][0]}</h1>
        <p className="text-sm text-stone-500">{titulos[modo][1]}</p>
      </div>

      {modo === "entrar" || modo === "crear" ? (
        <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-medium">
          {(["entrar", "crear"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => cambiarModo(m)}
              className={`h-9 rounded-lg transition ${modo === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
            >
              {m === "entrar" ? "Entrar" : "Crear cuenta"}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <Aviso>{error}</Aviso> : null}
      {aviso ? <Aviso tipo="ok">{aviso}</Aviso> : null}

      {GOOGLE_ACTIVO && (modo === "entrar" || modo === "crear") ? (
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

      <form onSubmit={enviar} className="space-y-4">
        {modo !== "verificar" ? (
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
        ) : (
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
        )}

        {modo === "entrar" || modo === "crear" ? (
          <Campo etiqueta="Contraseña" ayuda={modo === "crear" ? "Mínimo 8 caracteres." : undefined}>
            <Entrada
              type="password"
              autoComplete={modo === "crear" ? "new-password" : "current-password"}
              required
              minLength={modo === "crear" ? 8 : undefined}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </Campo>
        ) : null}

        {modo === "crear" ? (
          <Campo etiqueta="Repite la contraseña">
            <Entrada type="password" autoComplete="new-password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </Campo>
        ) : null}

        <Boton className="w-full" cargando={cargando}>
          {textoBoton[modo]}
        </Boton>
      </form>

      <div className="flex flex-col items-center gap-1 text-sm">
        {modo === "entrar" ? (
          <>
            <button type="button" className="text-stone-600 underline underline-offset-2" onClick={() => cambiarModo("olvide")}>
              Olvidé mi contraseña
            </button>
            <button type="button" className="text-stone-600 underline underline-offset-2" onClick={() => cambiarModo("codigo")}>
              Entrar sin contraseña (por correo)
            </button>
          </>
        ) : modo === "crear" ? null : (
          <button type="button" className="text-stone-600 underline underline-offset-2" onClick={() => cambiarModo("entrar")}>
            ← Volver a entrar con contraseña
          </button>
        )}
      </div>
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
