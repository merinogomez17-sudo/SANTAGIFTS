"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilaPersona } from "@/components/evento/ListaParticipantes";
import { Aviso, Avatar, Boton, Desplegable, Entrada, Tarjeta, Titulo } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Evento, Participante, PerfilCorto } from "@/lib/tipos";
import { nombreDe } from "@/lib/tipos";
import { mensajeError } from "@/lib/utils";

type Exclusion = { id: string; participante_a: string; participante_b: string };

export function PanelOrganizador({
  evento,
  participantes,
  yaSortearon,
  alCambiar,
}: {
  evento: Evento;
  participantes: Participante[];
  yaSortearon: Set<string>;
  alCambiar: () => void;
}) {
  const activo = evento.estado !== "terminado";
  const [error, setError] = useState("");

  async function quitar(p: Participante) {
    if (!confirm(`¿Quitar a ${nombreDe(p)} del intercambio?`)) return;
    setError("");
    const { error } = await createClient().rpc("quitar_participante", { p_participante: p.id });
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  async function desvincular(p: Participante) {
    if (!confirm(`¿Desvincular la cuenta de "${p.nombre}"? El lugar quedará libre para que la persona correcta lo tome.`)) return;
    setError("");
    const { error } = await createClient().rpc("liberar_lugar", { p_participante: p.id });
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  return (
    <>
      {activo ? <AgregarPersona evento={evento} participantes={participantes} alCambiar={alCambiar} /> : null}
      {activo ? <Invitar evento={evento} pendientes={participantes.filter((p) => !p.usuario_id).length} /> : null}

      <Tarjeta>
        <Titulo>Participantes · {participantes.length}</Titulo>
        <p className="-mt-2 mb-4 text-sm text-stone-500">Toca a alguien para ver su lista de deseos.</p>
        {error ? <div className="mb-3"><Aviso>{error}</Aviso></div> : null}
        <ul className="space-y-3">
          {participantes.map((p) => (
            <FilaPersona
              key={p.id}
              p={p}
              evento={evento}
              yaSorteo={yaSortearon.has(p.id)}
              acciones={
                activo && p.usuario_id !== evento.organizador_id ? (
                  <details className="relative">
                    <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100">
                      ⋯
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white text-sm shadow-lg">
                      {p.usuario_id ? (
                        <button className="block w-full px-3 py-2.5 text-left hover:bg-stone-50" onClick={() => desvincular(p)}>
                          Desvincular cuenta
                        </button>
                      ) : null}
                      <button className="block w-full px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => quitar(p)}>
                        Quitar del intercambio
                      </button>
                    </div>
                  </details>
                ) : null
              }
            />
          ))}
        </ul>
      </Tarjeta>

      <Exclusiones evento={evento} participantes={participantes} />
      <Sorteo evento={evento} total={participantes.length} alCambiar={alCambiar} />
      <Eliminar evento={evento} />
    </>
  );
}

function Eliminar({ evento }: { evento: Evento }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function eliminar() {
    const escrito = prompt(
      `Esto borra "${evento.nombre}" para todos: participantes, sorteo y mensajes. No se puede deshacer.\n\nEscribe el nombre del intercambio para confirmar:`,
    );
    if (escrito === null) return;
    if (escrito.trim().toLowerCase() !== evento.nombre.trim().toLowerCase()) return setError("El nombre no coincide. No se borró nada.");
    setError("");
    setCargando(true);
    const { error } = await createClient().rpc("eliminar_evento", { p_evento: evento.id });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    router.replace("/eventos");
  }

  return (
    <Desplegable titulo="Eliminar intercambio">
      <div className="space-y-3">
        <p className="text-sm text-stone-500">Se borra para todos, junto con el sorteo y los mensajes. No se puede deshacer.</p>
        {error ? <Aviso>{error}</Aviso> : null}
        <Boton variante="peligro" className="w-full" cargando={cargando} onClick={eliminar}>
          Eliminar intercambio
        </Boton>
      </div>
    </Desplegable>
  );
}

function AgregarPersona({
  evento,
  participantes,
  alCambiar,
}: {
  evento: Evento;
  participantes: Participante[];
  alCambiar: () => void;
}) {
  const [modo, setModo] = useState<"nombre" | "correo">("nombre");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [resultado, setResultado] = useState<PerfilCorto | null | undefined>(undefined);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function agregar(nombreLugar: string, usuarioId: string | null = null) {
    setError("");
    setCargando(true);
    const { error } = await createClient().rpc("agregar_participante", {
      p_evento: evento.id,
      p_nombre: nombreLugar,
      p_usuario: usuarioId,
    });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    setNombre("");
    setCorreo("");
    setResultado(undefined);
    alCambiar();
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { data, error } = await createClient().rpc("buscar_usuario", { p_correo: correo });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    setResultado(((data as PerfilCorto[] | null) ?? [])[0] ?? null);
  }

  const yaEsta = resultado && participantes.some((p) => p.usuario_id === resultado.id);

  return (
    <Desplegable titulo="Agregar personas">
      {evento.estado === "sorteado" ? (
        <p className="mb-3 text-sm text-stone-500">El sorteo ya está activo: la nueva persona entra al círculo y solo a una persona (elegida al azar) le toca volver a sacar su papelito. Los demás no cambian.</p>
      ) : null}
      <div className="mb-3 grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-medium">
        {(["nombre", "correo"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setModo(m);
              setError("");
            }}
            className={`h-9 rounded-lg transition ${modo === m ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}
          >
            {m === "nombre" ? "Por nombre" : "Ya tiene cuenta"}
          </button>
        ))}
      </div>

      {modo === "nombre" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) agregar(nombre.trim());
          }}
          className="flex gap-2"
        >
          <Entrada required maxLength={80} placeholder="Ej. Tía Lupe" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Boton cargando={cargando}>Agregar</Boton>
        </form>
      ) : (
        <>
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
            <Boton variante="secundario" cargando={cargando}>
              Buscar
            </Boton>
          </form>
          {resultado === null ? (
            <p className="mt-3 text-sm text-stone-500">No encontramos a nadie con ese correo. Agrégalo por nombre y mándale el link.</p>
          ) : resultado ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-stone-50 p-3">
              <Avatar nombre={resultado.nombre} foto={resultado.foto_url} tam={36} />
              <span className="flex-1 text-sm font-medium">{resultado.nombre}</span>
              {yaEsta ? (
                <span className="text-xs text-stone-500">Ya está dentro</span>
              ) : (
                <Boton className="h-9" cargando={cargando} onClick={() => agregar(resultado.nombre, resultado.id)}>
                  Agregar
                </Boton>
              )}
            </div>
          ) : null}
        </>
      )}
      {error ? <div className="mt-3"><Aviso>{error}</Aviso></div> : null}
    </Desplegable>
  );
}

function Invitar({ evento, pendientes }: { evento: Evento; pendientes: number }) {
  const [copiado, setCopiado] = useState(false);
  // Este panel solo se pinta en el navegador (después de revisar la sesión), así que window existe
  const link = `${window.location.origin}/unirse/${evento.codigo_invitacion}`;
  const texto = `¡Ya está el intercambio "${evento.nombre}"! 🎁 Entra aquí, elige tu nombre y saca tu papelito: ${link}`;

  return (
    <Desplegable titulo="Comparte el link" resumen={pendientes > 0 ? `Faltan ${pendientes}` : "Todos entraron"}>
      <p className="mb-3 text-sm text-stone-500">
        Cada quien entra, elige su nombre de la lista y saca su papelito.
        {pendientes > 0 ? ` Faltan ${pendientes} por entrar.` : ""}
      </p>
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
    </Desplegable>
  );
}

function Exclusiones({ evento, participantes }: { evento: Evento; participantes: Participante[] }) {
  const abierto = evento.estado === "abierto";
  const [lista, setLista] = useState<Exclusion[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState("");
  const nombre = (id: string) => {
    const p = participantes.find((x) => x.id === id);
    return p ? nombreDe(p) : "—";
  };

  const cargar = useCallback(async () => {
    const { data } = await createClient().from("exclusiones").select("id, participante_a, participante_b").eq("evento_id", evento.id);
    setLista((data as Exclusion[]) ?? []);
  }, [evento.id]);

  useEffect(() => {
    cargar();
  }, [cargar, participantes.length]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!a || !b || a === b) return setError("Elige dos personas distintas");
    const { error } = await createClient().from("exclusiones").insert({ evento_id: evento.id, participante_a: a, participante_b: b });
    if (error) return setError(error.code === "23505" ? "Esa pareja ya está agregada" : mensajeError(error));
    setA("");
    setB("");
    cargar();
  }

  if (!abierto) return null;

  const selector = (valor: string, cambiar: (v: string) => void) => (
    <select
      value={valor}
      onChange={(e) => cambiar(e.target.value)}
      className="h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-900"
    >
      <option value="">Elegir…</option>
      {participantes.map((p) => (
        <option key={p.id} value={p.id}>
          {nombreDe(p)}
        </option>
      ))}
    </select>
  );

  return (
    <Desplegable titulo="No se pueden tocar entre sí" resumen={lista.length ? `${lista.length} ${lista.length === 1 ? "pareja" : "parejas"}` : "Opcional"}>
      <p className="mb-3 text-sm text-stone-500">Opcional. Por ejemplo, parejas o hermanos que viven juntos.</p>
      {lista.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {lista.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-sm">
              <span className="flex-1">
                {nombre(x.participante_a)} <span className="text-stone-400">↔</span> {nombre(x.participante_b)}
              </span>
              <button
                className="text-xs text-stone-400 hover:text-rose-600"
                onClick={async () => {
                  await createClient().from("exclusiones").delete().eq("id", x.id);
                  cargar();
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
    </Desplegable>
  );
}

function Sorteo({ evento, total, alCambiar }: { evento: Evento; total: number; alCambiar: () => void }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function activar(rehacer: boolean) {
    const pregunta = rehacer
      ? "¿Rehacer el sorteo? Todos tendrán que volver a sacar su papelito y se borrarán los mensajes."
      : `¿Activar el sorteo con ${total} personas? Después cada quien saca su papelito desde su celular.`;
    if (!confirm(pregunta)) return;
    setError("");
    setCargando(true);
    const { error } = await createClient().rpc("sortear", { p_evento: evento.id, p_rehacer: rehacer });
    setCargando(false);
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  async function terminar() {
    if (
      !confirm(
        "¿Cerrar el intercambio? Úsalo cuando ya se hayan dado los regalos. Ya no se podrá agregar gente ni sacar papelitos (puedes reabrirlo después).",
      )
    )
      return;
    const { error } = await createClient().rpc("terminar_evento", { p_evento: evento.id });
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  async function reabrir() {
    setError("");
    const { error } = await createClient().rpc("reabrir_evento", { p_evento: evento.id });
    if (error) return setError(mensajeError(error));
    alCambiar();
  }

  if (evento.estado === "terminado")
    return (
      <Tarjeta className="space-y-3">
        <Titulo>Intercambio cerrado</Titulo>
        <p className="-mt-2 text-sm text-stone-500">Ya no se pueden sacar papelitos ni agregar gente. Si lo cerraste por error, ábrelo de nuevo; el sorteo se conserva.</p>
        {error ? <Aviso>{error}</Aviso> : null}
        <Boton variante="secundario" className="w-full" onClick={reabrir}>
          Reabrir intercambio
        </Boton>
      </Tarjeta>
    );

  return (
    <Tarjeta className="space-y-3">
      {evento.estado === "abierto" ? (
        <>
          <Titulo>Sorteo</Titulo>
          <p className="-mt-2 text-sm text-stone-500">
            {total < 3
              ? `Se necesitan al menos 3 personas (van ${total}).`
              : "Al activarlo se arma el sorteo en secreto. Cada quien saca su papelito cuando quiera, y nadie, ni tú, ve el resultado de los demás. 🤫"}
          </p>
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton className="h-12 w-full" disabled={total < 3} cargando={cargando} onClick={() => activar(false)}>
            🎲 Activar sorteo
          </Boton>
        </>
      ) : (
        <>
          <Titulo>Opciones del organizador</Titulo>
          {error ? <Aviso>{error}</Aviso> : null}
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="peligro" cargando={cargando} onClick={() => activar(true)}>
              Rehacer sorteo
            </Boton>
            <Boton variante="secundario" onClick={terminar}>
              Cerrar (ya se dieron)
            </Boton>
          </div>
        </>
      )}
    </Tarjeta>
  );
}
