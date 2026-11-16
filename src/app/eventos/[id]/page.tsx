"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AmigoSecreto } from "@/components/evento/AmigoSecreto";
import { ListaParticipantes } from "@/components/evento/ListaParticipantes";
import { MensajesDeMiSanta } from "@/components/evento/MensajesDeMiSanta";
import { PanelOrganizador } from "@/components/evento/PanelOrganizador";
import { Cargando, Encabezado, Pagina, Tarjeta } from "@/components/ui";
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
  const [yaSortearon, setYaSortearon] = useState<Set<string>>(new Set());

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const [{ data: ev }, { data: ps }, { data: est }] = await Promise.all([
      supabase.from("eventos").select("*").eq("id", id).maybeSingle<Evento>(),
      supabase
        .from("participantes")
        .select("id, nombre, usuario_id, perfil:perfiles(id, nombre, foto_url)")
        .eq("evento_id", id)
        .order("creado_en"),
      supabase.rpc("estado_sorteo", { p_evento: id }),
    ]);
    setEvento(ev ?? null);
    setParticipantes((ps as unknown as Participante[]) ?? []);
    setYaSortearon(
      new Set(((est as { participante_id: string; ya_sorteo: boolean }[] | null) ?? []).filter((x) => x.ya_sorteo).map((x) => x.participante_id)),
    );
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
  const soyParticipante = participantes.some((p) => p.usuario_id === usuario.id);

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

        {evento.estado === "abierto" ? (
          <Tarjeta className="text-center">
            <div className="text-3xl">⏳</div>
            <p className="mt-2 font-medium">{soyOrganizador ? "Arma la lista y activa el sorteo" : "Esperando que se active el sorteo"}</p>
            <p className="mt-1 text-sm text-stone-500">
              {soyOrganizador
                ? "Cuando estén todos, activa el sorteo y cada quien sacará su papelito desde su celular."
                : "Cuando el organizador lo active, aquí podrás sacar tu papelito. Mientras, completa tu lista de deseos."}
            </p>
            {!soyOrganizador ? (
              <Link href="/perfil" className="mt-3 inline-block text-sm font-medium underline underline-offset-2">
                Ir a mi lista de deseos
              </Link>
            ) : null}
          </Tarjeta>
        ) : soyParticipante ? (
          <>
            <AmigoSecreto evento={evento} alSortear={cargar} />
            <MensajesDeMiSanta eventoId={evento.id} />
          </>
        ) : null}

        {soyOrganizador ? (
          <PanelOrganizador evento={evento} participantes={participantes} yaSortearon={yaSortearon} alCambiar={cargar} />
        ) : (
          <ListaParticipantes evento={evento} participantes={participantes} yaSortearon={yaSortearon} />
        )}
      </Pagina>
    </>
  );
}
