"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AmigoSecreto } from "@/components/evento/AmigoSecreto";
import { MensajesDeMiSanta } from "@/components/evento/MensajesDeMiSanta";
import { PanelOrganizador } from "@/components/evento/PanelOrganizador";
import { Avatar, Cargando, Encabezado, Pagina, Tarjeta, Titulo } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import type { Evento, Participante } from "@/lib/tipos";
import { fecha, presupuesto } from "@/lib/utils";

export default function EventoPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Evento_ />
    </Suspense>
  );
}

function Evento_() {
  const { id } = useParams<{ id: string }>();
  const { cargando, usuario, perfil } = useSesion();
  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);
  const [participantes, setParticipantes] = useState<Participante[]>([]);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ev }, { data: ps }] = await Promise.all([
      supabase.from("eventos").select("*").eq("id", id).maybeSingle<Evento>(),
      supabase.from("participantes").select("usuario_id, perfil:perfiles(id, nombre, foto_url)").eq("evento_id", id).order("unido_en"),
    ]);
    setEvento(ev ?? null);
    setParticipantes((ps as unknown as Participante[]) ?? []);
  }, [id]);

  useEffect(() => {
    if (usuario) cargar();
  }, [usuario, cargar]);

  if (cargando || !usuario || evento === undefined) return <Cargando />;

  if (evento === null)
    return (
      <>
        <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
        <Pagina>
          <p className="py-16 text-center text-stone-500">No encontramos este intercambio.</p>
        </Pagina>
      </>
    );

  const soyOrganizador = evento.organizador_id === usuario.id;
  const yaSorteado = evento.estado !== "abierto";

  return (
    <>
      <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
      <Pagina>
        <Link href="/eventos" className="text-sm text-stone-500 hover:text-stone-900">
          ← Intercambios
        </Link>

        <div className="space-y-2 pb-2">
          <h1 className="text-2xl font-semibold tracking-tight">{evento.nombre}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
            <span>📅 {fecha(evento.fecha_evento)}</span>
            {evento.lugar ? <span>📍 {evento.lugar}</span> : null}
            <span>💰 {presupuesto(evento)}</span>
          </div>
          {evento.descripcion ? <p className="text-sm text-stone-500">{evento.descripcion}</p> : null}
        </div>

        {yaSorteado ? (
          <>
            <AmigoSecreto evento={evento} />
            <MensajesDeMiSanta eventoId={evento.id} />
          </>
        ) : !soyOrganizador ? (
          <Tarjeta className="text-center">
            <div className="text-3xl">⏳</div>
            <p className="mt-2 font-medium">Esperando el sorteo</p>
            <p className="mt-1 text-sm text-stone-500">Mientras, completa tu lista de deseos en tu perfil.</p>
            <Link href="/perfil" className="mt-3 inline-block text-sm font-medium underline underline-offset-2">
              Ir a mi lista de deseos
            </Link>
          </Tarjeta>
        ) : null}

        {soyOrganizador ? (
          <PanelOrganizador evento={evento} participantes={participantes} alCambiar={cargar} />
        ) : (
          <Tarjeta>
            <Titulo>Participantes · {participantes.length}</Titulo>
            <ul className="space-y-3">
              {participantes.map((p) => (
                <li key={p.usuario_id} className="flex items-center gap-3">
                  <Avatar nombre={p.perfil?.nombre} foto={p.perfil?.foto_url} tam={36} />
                  <span className="text-sm">
                    {p.perfil?.nombre}
                    {p.usuario_id === evento.organizador_id ? <span className="ml-2 text-xs text-stone-400">organiza</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </Pagina>
    </>
  );
}
