"use client";

import { useState } from "react";
import { Aviso, Boton, Campo, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/utils";

/** Pone o cambia la contraseña de quien ya tiene sesión. */
export function CambiarContrasena({ alTerminar, textoBoton = "Guardar contraseña" }: { alTerminar?: () => void; textoBoton?: string }) {
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (contrasena.length < 8) return setAviso({ tipo: "error", texto: "Debe tener al menos 8 caracteres" });
    if (contrasena !== confirmar) return setAviso({ tipo: "error", texto: "Las contraseñas no coinciden" });
    setCargando(true);
    const { error } = await createClient().auth.updateUser({ password: contrasena });
    setCargando(false);
    if (error) {
      const m = mensajeError(error).toLowerCase();
      return setAviso({
        tipo: "error",
        texto: m.includes("different from the old") ? "Usa una contraseña distinta a la anterior" : mensajeError(error),
      });
    }
    setContrasena("");
    setConfirmar("");
    setAviso({ tipo: "ok", texto: "Contraseña guardada. La próxima vez puedes entrar con ella." });
    alTerminar?.();
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      <Campo etiqueta="Contraseña nueva" ayuda="Mínimo 8 caracteres.">
        <Entrada type="password" autoComplete="new-password" required minLength={8} value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
      </Campo>
      <Campo etiqueta="Repítela">
        <Entrada type="password" autoComplete="new-password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
      </Campo>
      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
      <Boton variante="secundario" className="w-full" cargando={cargando}>
        {textoBoton}
      </Boton>
    </form>
  );
}
