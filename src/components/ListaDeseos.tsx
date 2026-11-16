"use client";

import { useCallback, useEffect, useState } from "react";
import { Aviso, Boton, Entrada, Proximamente, Tarjeta, Titulo } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Deseo } from "@/lib/tipos";
import { dinero, mensajeError } from "@/lib/utils";

function linkSeguro(link: string | null) {
  if (!link) return null;
  try {
    const u = new URL(link);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Lista de deseos de una persona. Con `editable` se puede agregar y borrar. */
export function ListaDeseos({ usuarioId, editable, titulo = "Mi lista de deseos" }: { usuarioId: string; editable?: boolean; titulo?: string }) {
  const [deseos, setDeseos] = useState<Deseo[] | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [link, setLink] = useState("");
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await createClient()
      .from("deseos")
      .select("*")
      .eq("usuario_id", usuarioId)
      .order("creado_en", { ascending: true });
    setDeseos((data as Deseo[]) ?? []);
  }, [usuarioId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const l = link.trim();
    if (l && !linkSeguro(l)) return setError("El link debe empezar con https://");
    setGuardando(true);
    const { error } = await createClient()
      .from("deseos")
      .insert({ usuario_id: usuarioId, descripcion: descripcion.trim(), link: l || null, precio_aprox: precio ? Number(precio) : null });
    setGuardando(false);
    if (error) return setError(mensajeError(error));
    setDescripcion("");
    setLink("");
    setPrecio("");
    cargar();
  }

  async function borrar(id: string) {
    await createClient().from("deseos").delete().eq("id", id);
    cargar();
  }

  return (
    <Tarjeta>
      <Titulo>{titulo}</Titulo>
      {deseos === null ? (
        <p className="text-sm text-stone-400">Cargando…</p>
      ) : deseos.length === 0 ? (
        <p className="text-sm text-stone-500">{editable ? "Agrega al menos 3 ideas para ayudarle a tu amigo secreto." : "Todavía no agrega deseos."}</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {deseos.map((d) => {
            const url = linkSeguro(d.link);
            return (
              <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0">
                <span className="mt-0.5 text-lg">🎁</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-900">{d.descripcion}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-500">
                    {d.precio_aprox != null ? <span>~{dinero(d.precio_aprox)}</span> : null}
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-stone-900 underline underline-offset-2">
                        Ver producto
                      </a>
                    ) : null}
                  </div>
                </div>
                {editable ? (
                  <button onClick={() => borrar(d.id)} className="text-xs text-stone-400 hover:text-rose-600" aria-label="Borrar">
                    Quitar
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <form onSubmit={agregar} className="mt-4 space-y-3 border-t border-stone-100 pt-4">
          <Entrada required maxLength={300} placeholder="¿Qué te gustaría?" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Entrada type="url" inputMode="url" placeholder="Link (opcional)" value={link} onChange={(e) => setLink(e.target.value)} />
            <Entrada type="number" inputMode="numeric" min={0} placeholder="$ aprox" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </div>
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton variante="secundario" className="w-full" cargando={guardando}>
            Agregar a mi lista
          </Boton>
          <Proximamente titulo="Tienda de regalos" texto="Pronto podrás buscar regalos de Mercado Libre y Amazon dentro de tu presupuesto." />
        </form>
      ) : null}
    </Tarjeta>
  );
}
