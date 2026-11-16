"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CambiarContrasena } from "@/components/CambiarContrasena";
import { Cargando } from "@/components/ui";
import { useSesion } from "@/components/useSesion";

// Llega aquí desde el correo de "Olvidé mi contraseña", ya con sesión iniciada.
export default function RestablecerPage() {
  const router = useRouter();
  const { cargando, usuario } = useSesion({ requierePerfil: false });

  if (cargando || !usuario) return <Cargando />;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2 text-center">
        <div className="text-4xl">🔑</div>
        <h1 className="text-2xl font-semibold tracking-tight">Pon tu contraseña nueva</h1>
        <p className="text-sm text-stone-500">{usuario.email}</p>
      </div>
      <CambiarContrasena textoBoton="Guardar y entrar" alTerminar={() => setTimeout(() => router.replace("/eventos"), 1200)} />
      <Link href="/eventos" className="text-center text-sm text-stone-500 underline underline-offset-2">
        Ahora no
      </Link>
    </main>
  );
}
