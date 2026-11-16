"use client";

import type { ReactNode } from "react";
import { Avatar, Tarjeta, Titulo } from "@/components/ui";
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
  return (
    <li className="flex items-center gap-3">
      <Avatar nombre={nombreDe(p)} foto={p.perfil?.foto_url} tam={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {nombreDe(p)}
          {p.usuario_id === evento.organizador_id ? <span className="ml-2 text-xs text-stone-400">organiza</span> : null}
        </p>
        {p.perfil?.nombre && p.perfil.nombre !== p.nombre ? <p className="truncate text-xs text-stone-400">Lugar: {p.nombre}</p> : null}
      </div>
      <EstadoPersona p={p} evento={evento} yaSorteo={yaSorteo} />
      {acciones}
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
      <ul className="space-y-3">
        {participantes.map((p) => (
          <FilaPersona key={p.id} p={p} evento={evento} yaSorteo={yaSortearon.has(p.id)} />
        ))}
      </ul>
    </Tarjeta>
  );
}
