"use client";

import { useState } from "react";
import { AreaTexto, Aviso, Boton, Campo, Entrada, Tarjeta } from "@/components/ui";
import type { Evento } from "@/lib/tipos";

export type DatosEvento = {
  nombre: string;
  fecha_evento: string | null;
  lugar: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  descripcion: string | null;
};

const dos = (n: number) => String(n).padStart(2, "0");

/** Convierte la fecha guardada a los valores de los campos fecha/hora (hora local). */
function aCampos(iso: string | null) {
  if (!iso) return { fecha: "", hora: "" };
  const d = new Date(iso);
  return { fecha: `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`, hora: `${dos(d.getHours())}:${dos(d.getMinutes())}` };
}

/** Formulario de nuevo intercambio y de editar intercambio. */
export function FormularioEvento({
  inicial,
  textoBoton,
  alGuardar,
}: {
  inicial?: Evento;
  textoBoton: string;
  alGuardar: (datos: DatosEvento) => Promise<string | void>;
}) {
  const [f, setF] = useState(() => ({
    nombre: inicial?.nombre ?? "",
    ...aCampos(inicial?.fecha_evento ?? null),
    lugar: inicial?.lugar ?? "",
    min: inicial?.presupuesto_min != null ? String(Number(inicial.presupuesto_min)) : "",
    max: inicial?.presupuesto_max != null ? String(Number(inicial.presupuesto_max)) : "",
    descripcion: inicial?.descripcion ?? "",
  }));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cambiar = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const min = f.min ? Number(f.min) : null;
    const max = f.max ? Number(f.max) : null;
    if (min != null && max != null && max < min) return setError("El máximo no puede ser menor que el mínimo");
    setGuardando(true);
    const problema = await alGuardar({
      nombre: f.nombre.trim(),
      fecha_evento: f.fecha ? new Date(`${f.fecha}T${f.hora || "19:00"}`).toISOString() : null,
      lugar: f.lugar.trim() || null,
      presupuesto_min: min,
      presupuesto_max: max,
      descripcion: f.descripcion.trim() || null,
    });
    setGuardando(false);
    if (problema) setError(problema);
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
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
        <Campo etiqueta="Presupuesto (MXN)" ayuda="Puedes poner solo el máximo, o el mismo número en los dos para un monto fijo.">
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
        {textoBoton}
      </Boton>
    </form>
  );
}
