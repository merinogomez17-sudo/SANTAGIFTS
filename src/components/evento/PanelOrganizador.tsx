"use client";

import { useCallback, useEffect, useState } from "react";
import { Aviso, Avatar, Boton, Entrada, Tarjeta, Titulo } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Evento, Participante, PerfilCorto } from "@/lib/tipos";
import { mensajeError } from "@/lib/utils";

type Exclusion = { id: string; usuario_a: string; usuario_b: string };

export function PanelOrganizador({
  evento,
  participantes,
  alCambiar,
}: {
  evento: Evento;
  participantes: Participante[];
  alCambiar: () => void;
}) {
  const abierto = evento.estado === "abierto";
  const nombre = (id: string) => participantes.find((p) => p.usuario_id === id)?.perfil?.nombre ?? "—";

  return (
    <>
      {abierto ? <Invitar evento={evento} /> : null}
      {abierto ? <AgregarPorCorreo evento={evento} participantes={participantes} alCambiar={alCambiar} /> : null}

      <Tarjeta>
        <Titulo>Participantes · {participantes.length}</Titulo>
        <ul className="space-y-3">
          {participantes.map((p) => (
            <li key={p.usuario_id} className="flex items-center gap-3">
              <Avatar nombre={p.perfil?.nombre} foto={p.perfil?.foto_url} tam={36} />
              <span className="flex-1 text-sm">
                {p.perfil?.nombre}
                {p.usuario_id === evento.organizador_id ? <span className="ml-2 text-xs text-stone-400">tú</span> : null}
              </span>
              {abierto && p.usuario_id !== evento.organizador_id ? (
                <button
                  className="text-xs text-stone-400 hover:text-rose-600"
                  onClick={async () => {
                    if (!confirm(`¿Quitar a ${p.perfil?.nombre} del intercambio?`)) return;
                    await createClient().from("participantes").delete().eq("evento_id", evento.id).eq("usuario_id", p.usuario_id);
                    alCambiar();
                  }}
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Exclusiones evento={evento} participantes={participantes} nombre={nombre} />
      <Sorteo evento={evento} total={participantes.length} alCambiar={alCambiar} />
    </>
  );
}

function Invitar({ evento }: { evento: Evento }) {
  const [copiado, setCopiado] = useState(false);
  // Este panel solo se pinta en el navegador (después de revisar la sesión), así que window existe
  const link = `${window.location.origin}/unirse/${evento.codigo_invitacion}`;

  const texto = `¡Te invito a nuestro intercambio de regalos "${evento.nombre}"! 🎁 Entra aquí: ${link}`;

  return (
    <Tarjeta>
      <Titulo>Invita con un link</Titulo>
      <div className="rounded-xl bg-stone-100 px-3 py-2.5 font-mono text-xs break-all text-stone-700">{link}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Boton
          variante="secundario"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? "¡Copiado!" : "Copiar link"}
        </Boton>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#25D366] px-4 text-sm font-medium text-white hover:brightness-95"
        >
          WhatsApp
        </a>
      </div>
    </Tarjeta>
  );
}

function AgregarPorCorreo({
  evento,
  participantes,
  alCambiar,
}: {
  evento: Evento;
  participantes: Participante[];
  alCambiar: () => void;
}) {
  const [correo, setCorreo] = useState("");
  const [resultado, setResultado] = useState<PerfilCorto | null | undefined>(undefined);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBuscando(true);
    const { data, error } = await createClient().rpc("buscar_usuario", { p_correo: correo });
    setBuscando(false);
    if (error) return setError(mensajeError(error));
    setResultado(((data as PerfilCorto[] | null) ?? [])[0] ?? null);
  }

  async function agregar(p: PerfilCorto) {
    const { error } = await createClient().from("participantes").insert({ evento_id: evento.id, usuario_id: p.id });
    if (error) return setError(mensajeError(error));
    setCorreo("");
    setResultado(undefined);
    alCambiar();
  }

  const yaEsta = resultado && participantes.some((p) => p.usuario_id === resultado.id);

  return (
    <Tarjeta>
      <Titulo>¿Ya tiene cuenta? Búscalo</Titulo>
      <form onSubmit={buscar} className="flex gap-2">
        <Entrada
          type="email"
          inputMode="email"
          required
          placeholder="correo@ejemplo.com"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            setResultado(undefined);
          }}
        />
        <Boton variante="secundario" cargando={buscando}>
          Buscar
        </Boton>
      </form>
      {error ? <div className="mt-3"><Aviso>{error}</Aviso></div> : null}
      {resultado === null ? (
        <p className="mt-3 text-sm text-stone-500">No encontramos a nadie con ese correo. Mándale el link de invitación 👆</p>
      ) : resultado ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 p-3">
          <Avatar nombre={resultado.nombre} foto={resultado.foto_url} tam={36} />
          <span className="flex-1 text-sm font-medium">{resultado.nombre}</span>
          {yaEsta ? (
            <span className="text-xs text-stone-500">Ya está dentro</span>
          ) : (
            <Boton className="h-9" onClick={() => agregar(resultado)}>
              Agregar
            </Boton>
          )}
        </div>
      ) : null}
    </Tarjeta>
  );
}

function Exclusiones({
  evento,
  participantes,
  nombre,
}: {
  evento: Evento;
  participantes: Participante[];
  nombre: (id: string) => string;
}) {
  const abierto = evento.estado === "abierto";
  const [lista, setLista] = useState<Exclusion[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await createClient().from("exclusiones").select("id, usuario_a, usuario_b").eq("evento_id", evento.id);
    setLista((data as Exclusion[]) ?? []);
  }, [evento.id]);

  useEffect(() => {
    cargar();
  }, [cargar, participantes.length]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!a || !b || a === b) return setError("Elige dos personas distintas");
    const { error } = await createClient().from("exclusiones").insert({ evento_id: evento.id, usuario_a: a, usuario_b: b });
    if (error) return setError(error.code === "23505" ? "Esa pareja ya está agregada" : mensajeError(error));
    setA("");
    setB("");
    cargar();
  }

  if (!abierto && lista.length === 0) return null;

  const selector = (valor: string, cambiar: (v: string) => void) => (
    <select
      value={valor}
      onChange={(e) => cambiar(e.target.value)}
      className="h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-900"
    >
      <option value="">Elegir…</option>
      {participantes.map((p) => (
        <option key={p.usuario_id} value={p.usuario_id}>
          {p.perfil?.nombre}
        </option>
      ))}
    </select>
  );

  return (
    <Tarjeta>
      <Titulo>No se pueden tocar entre sí</Titulo>
      <p className="-mt-2 mb-3 text-sm text-stone-500">Por ejemplo, parejas o hermanos que viven juntos.</p>
      {lista.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {lista.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm">
              <span className="flex-1">
                {nombre(x.usuario_a)} <span className="text-stone-400">↔</span> {nombre(x.usuario_b)}
              </span>
              {abierto ? (
                <button
                  className="text-xs text-stone-400 hover:text-rose-600"
                  onClick={async () => {
                    await createClient().from("exclusiones").delete().eq("id", x.id);
                    cargar();
                  }}
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {abierto ? (
        <form onSubmit={agregar} className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {selector(a, setA)}
            <span className="text-stone-400">↔</span>
            {selector(b, setB)}
          </div>
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton variante="secundario" className="w-full">
            Agregar pareja
          </Boton>
        </form>
      ) : null}
    </Tarjeta>
  );
}

function Sorteo({ evento, total, alCambiar }: { evento: Evento; total: number; alCambiar: () => void }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function sortear(rehacer: boolean) {
    const pregunta = rehacer
      ? "¿Rehacer el sorteo? A todos les tocará alguien nuevo y se borrarán los mensajes."
      : `¿Hacer el sorteo con ${total} personas? Después ya no podrás agregar a nadie.`;
    if (!confirm(pregunta)) return;
    setError("");
    setCargando(true);
    const { error } = await createClient().rpc("sortear", { p_evento: evento.id, p_rehacer: rehacer });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  async function terminar() {
    if (!confirm("¿Marcar el intercambio como terminado?")) return;
    const { error } = await createClient().rpc("terminar_evento", { p_evento: evento.id });
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  if (evento.estado === "terminado") return null;

  return (
    <Tarjeta className="space-y-3">
      {evento.estado === "abierto" ? (
        <>
          <Titulo>Sorteo</Titulo>
          <p className="-mt-2 text-sm text-stone-500">
            {total < 3 ? `Se necesitan al menos 3 personas (van ${total}).` : "Nadie, ni tú, podrá ver el resultado completo. 🤫"}
          </p>
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton className="h-12 w-full" disabled={total < 3} cargando={cargando} onClick={() => sortear(false)}>
            🎲 Hacer el sorteo
          </Boton>
        </>
      ) : (
        <>
          <Titulo>Opciones del organizador</Titulo>
          {error ? <Aviso>{error}</Aviso> : null}
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="peligro" cargando={cargando} onClick={() => sortear(true)}>
              Rehacer sorteo
            </Boton>
            <Boton variante="secundario" onClick={terminar}>
              Terminar
            </Boton>
          </div>
        </>
      )}
    </Tarjeta>
  );
}
