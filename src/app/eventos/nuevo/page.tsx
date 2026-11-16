"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AreaTexto, Aviso, Boton, Campo, Cargando, Encabezado, Entrada, Pagina, Tarjeta } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/utils";

export default function NuevoEventoPage() {
  const router = useRouter();
  const { cargando, usuario, perfil } = useSesion();
  const [f, setF] = useState({ nombre: "", fecha: "", hora: "", lugar: "", min: "", max: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  if (cargando || !usuario) return <Cargando />;

  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const min = f.min ? Number(f.min) : null;
    const max = f.max ? Number(f.max) : null;
    if (min != null && max != null && max < min) return setError("El máximo no puede ser menor que el mínimo");
    setGuardando(true);
    const fechaEvento = f.fecha ? new Date(`${f.fecha}T${f.hora || "19:00"}`).toISOString() : null;
    const { data, error } = await createClient()
      .from("eventos")
      .insert({
        organizador_id: usuario!.id,
        nombre: f.nombre.trim(),
        fecha_evento: fechaEvento,
        lugar: f.lugar.trim() || null,
        presupuesto_min: min,
        presupuesto_max: max,
        descripcion: f.descripcion.trim() || null,
      })
      .select("id")
      .single<{ id: string }>();
    setGuardando(false);
    if (error) return setError(mensajeError(error));
    router.replace(`/eventos/${data.id}`);
  }

  return (
    <>
      <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
      <Pagina>
        <h1 className="pb-2 text-2xl font-semibold tracking-tight">Nuevo intercambio</h1>
        <form onSubmit={crear} className="space-y-4">
          <Tarjeta className="space-y-4">
            <Campo etiqueta="Nombre">
              <Entrada required maxLength={120} placeholder="Navidad familia Merino 2026" value={f.nombre} onChange={cambiar("nombre")} />
            </Campo>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Campo etiqueta="Fecha">
                <Entrada type="date" value={f.fecha} onChange={cambiar("fecha")} />
              </Campo>
              <Campo etiqueta="Hora">
                <Entrada type="time" value={f.hora} onChange={cambiar("hora")} />
              </Campo>
            </div>
            <Campo etiqueta="Lugar">
              <Entrada maxLength={200} placeholder="Casa de la abuela" value={f.lugar} onChange={cambiar("lugar")} />
            </Campo>
          </Tarjeta>

          <Tarjeta className="space-y-4">
            <Campo etiqueta="Presupuesto (MXN)" ayuda="Puedes poner solo el máximo.">
              <div className="grid grid-cols-2 gap-3">
                <Entrada type="number" inputMode="numeric" min={0} placeholder="Mínimo" value={f.min} onChange={cambiar("min")} />
                <Entrada type="number" inputMode="numeric" min={0} placeholder="Máximo" value={f.max} onChange={cambiar("max")} />
              </div>
            </Campo>
            <Campo etiqueta="Notas para todos">
              <AreaTexto maxLength={1000} placeholder="Llevar el regalo envuelto y con nombre 🎀" value={f.descripcion} onChange={cambiar("descripcion")} />
            </Campo>
          </Tarjeta>

          {error ? <Aviso>{error}</Aviso> : null}
          <Boton className="w-full" cargando={guardando}>
            Crear intercambio
          </Boton>
        </form>
      </Pagina>
    </>
  );
}
