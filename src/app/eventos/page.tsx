"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InstalarApp } from "@/components/InstalarApp";
import { Cargando, Encabezado, Pagina } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import type { Evento } from "@/lib/tipos";
import { fecha, presupuesto } from "@/lib/utils";

const etiquetaEstado = {
  abierto: { texto: "Invitando", clase: "bg-amber-50 text-amber-700" },
  sorteado: { texto: "Sorteado", clase: "bg-emerald-50 text-emerald-700" },
  terminado: { texto: "Terminado", clase: "bg-stone-100 text-stone-500" },
};

export default function EventosPage() {
  const { cargando, usuario, perfil } = useSesion();
  const [eventos, setEventos] = useState<Evento[] | null>(null);

  useEffect(() => {
    if (!usuario) return;
    createClient()
      .from("participantes")
      .select("evento:eventos(*)")
      .eq("usuario_id", usuario.id)
      .then(({ data }) => {
        const lista = ((data ?? []) as unknown as { evento: Evento | null }[])
          .map((r) => r.evento)
          .filter((e): e is Evento => !!e)
          .sort((a, b) => (a.fecha_evento ?? "9").localeCompare(b.fecha_evento ?? "9"));
        setEventos(lista);
      });
  }, [usuario]);

  if (cargando || !usuario) return <Cargando />;

  return (
    <>
      <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
      <Pagina>
        <InstalarApp />
        <div className="flex items-end justify-between gap-3 pb-2">
          <div>
            <p className="text-sm text-stone-500">Hola, {perfil?.nombre?.split(" ")[0]} 👋</p>
            <h1 className="text-2xl font-semibold tracking-tight">Tus intercambios</h1>
          </div>
          <Link
            href="/eventos/nuevo"
            className="inline-flex h-10 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
          >
            + Nuevo
          </Link>
        </div>

        {eventos === null ? (
          <Cargando />
        ) : eventos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
            <div className="text-4xl">🎄</div>
            <p className="mt-3 font-medium">Aún no tienes intercambios</p>
            <p className="mt-1 text-sm text-stone-500">Crea uno o pide a alguien de tu familia que te invite.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link href={`/eventos/${e.id}`} className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-300">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{e.nombre}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${etiquetaEstado[e.estado].clase}`}>
                      {etiquetaEstado[e.estado].texto}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {fecha(e.fecha_evento)} · {presupuesto(e)}
                  </p>
                  {e.organizador_id === usuario.id ? <p className="mt-2 text-xs text-stone-400">Tú organizas</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Pagina>
    </>
  );
}
