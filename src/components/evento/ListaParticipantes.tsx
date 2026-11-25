"use client";

import { useState, type ReactNode } from "react";
import { ListaDeseos } from "@/components/ListaDeseos";
import { Avatar, FotoGrande, Tarjeta, Titulo } from "@/components/ui";
import type { Evento, Participante } from "@/lib/tipos";
import { nombreDe } from "@/lib/tipos";

export function EstadoPersona({ p, evento, yaSorteo }: { p: Participante; evento: Evento; yaSorteo: boolean }) {
  if (evento.estado !== "abierto") {
    return yaSorteo ? (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Ya sorteó 🎲</span>
    ) : (
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{p.usuario_id ? "Aún no sortea" : "No ha entrado"}</span>
    );
  }
  return p.usuario_id ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Ya entró ✓</span>
  ) : (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Pendiente</span>
  );
}

export function FilaPersona({
  p,
  evento,
  yaSorteo,
  acciones,
}: {
  p: Participante;
  evento: Evento;
  yaSorteo: boolean;
  acciones?: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const [verFoto, setVerFoto] = useState(false);
  const puedeAbrir = !!p.usuario_id;
  const foto = p.perfil?.foto_url;

  const datos = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {nombreDe(p)}
          {p.usuario_id === evento.organizador_id ? <span className="ml-2 text-xs text-stone-400">organiza</span> : null}
        </p>
        {p.perfil?.nombre && p.perfil.nombre !== p.nombre ? <p className="truncate text-xs text-stone-400">Lugar: {p.nombre}</p> : null}
      </div>
      <EstadoPersona p={p} evento={evento} yaSorteo={yaSorteo} />
    </>
  );

  return (
    <li>
      <div className="flex items-center gap-3">
        {foto ? (
          <button type="button" onClick={() => setVerFoto(true)} aria-label={`Ver foto de ${nombreDe(p)}`} className="shrink-0 rounded-full transition active:scale-95">
            <Avatar nombre={nombreDe(p)} foto={foto} tam={36} />
          </button>
        ) : (
          <Avatar nombre={nombreDe(p)} tam={36} />
        )}
        {puedeAbrir ? (
          <button
            type="button"
            onClick={() => setAbierta((a) => !a)}
            aria-expanded={abierta}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            {datos}
            <span className={`text-stone-400 transition ${abierta ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{datos}</div>
        )}
        {acciones}
      </div>
      {verFoto && foto ? <FotoGrande foto={foto} nombre={nombreDe(p)} alCerrar={() => setVerFoto(false)} /> : null}
      {abierta && p.usuario_id ? (
        <div className="mt-3 rounded-xl bg-stone-50 p-3">
          <p className="mb-2 text-xs font-medium text-stone-500">Lista de deseos</p>
          <ListaDeseos sinMarco usuarioId={p.usuario_id} eventoId={evento.id} />
        </div>
      ) : null}
    </li>
  );
}

export function ListaParticipantes({
  evento,
  participantes,
  yaSortearon,
}: {
  evento: Evento;
  participantes: Participante[];
  yaSortearon: Set<string>;
}) {
  return (
    <Tarjeta>
      <Titulo>Participantes · {participantes.length}</Titulo>
      <p className="-mt-2 mb-4 text-sm text-stone-500">Toca a alguien para ver su lista de deseos.</p>
      <ul className="space-y-3">
        {participantes.map((p) => (
          <FilaPersona key={p.id} p={p} evento={evento} yaSorteo={yaSortearon.has(p.id)} />
        ))}
      </ul>
    </Tarjeta>
  );
}
