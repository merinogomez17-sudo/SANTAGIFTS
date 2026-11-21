"use client";

import { useCallback, useEffect, useState } from "react";
import { ListaDeseos } from "@/components/ListaDeseos";
import { Aviso, Avatar, Boton, Desplegable, Tarjeta } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Evento, MensajeSanta, MiAmigo, Perfil, Pregunta } from "@/lib/tipos";
import { EMOJIS, hora, mensajeError, presupuesto } from "@/lib/utils";

const GIROS = ["🎁", "🎄", "⭐", "🎅", "❄️", "🦌", "🔔", "🍪"];

/** Lo que ve quien regala: el botón para sacar su papelito y, después, a quién le tocó. */
export function AmigoSecreto({ evento, alSortear }: { evento: Evento; alSortear?: () => void }) {
  const [amigo, setAmigo] = useState<MiAmigo | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [girando, setGirando] = useState(false);
  const [giro, setGiro] = useState(0);
  const [recienRevelado, setRecienRevelado] = useState(false);
  const [error, setError] = useState("");

  const mostrar = useCallback(async (a: MiAmigo | null) => {
    if (a?.usuario_id) {
      const { data } = await createClient().from("perfiles").select("*").eq("id", a.usuario_id).maybeSingle<Perfil>();
      setPerfil(data ?? null);
    } else setPerfil(null);
    setAmigo(a);
  }, []);

  useEffect(() => {
    createClient()
      .rpc("mi_amigo_secreto", { p_evento: evento.id })
      .then(({ data }) => mostrar(((data as MiAmigo[] | null) ?? [])[0] ?? null));
  }, [evento.id, evento.sorteado_en, mostrar]);

  async function sacarPapelito() {
    setError("");
    setGirando(true);
    const t = setInterval(() => setGiro((g) => g + 1), 90);
    const [{ data, error }] = await Promise.all([
      createClient().rpc("sortear_mi_amigo", { p_evento: evento.id }),
      new Promise((ok) => setTimeout(ok, 2200)),
    ]);
    clearInterval(t);
    setGirando(false);
    if (error) return setError(mensajeError(error));
    setRecienRevelado(true);
    await mostrar(((data as MiAmigo[] | null) ?? [])[0] ?? null);
    alSortear?.();
  }

  if (amigo === undefined) return null;

  if (amigo === null)
    return (
      <Tarjeta className="py-8 text-center">
        <div className={`text-6xl transition ${girando ? "scale-110" : ""}`}>{girando ? GIROS[giro % GIROS.length] : "🎁"}</div>
        <p className="mt-4 text-lg font-semibold">{girando ? "Revolviendo papelitos…" : "¡Ya puedes sacar tu papelito!"}</p>
        <p className="mt-1 text-sm text-stone-500">Solo tú vas a ver a quién le regalas.</p>
        {error ? <div className="mt-4"><Aviso>{error}</Aviso></div> : null}
        <Boton className="mt-6 h-12 w-full" cargando={girando} onClick={sacarPapelito}>
          🎲 Sacar mi papelito
        </Boton>
      </Tarjeta>
    );

  const nombre = amigo.nombre;
  const datos = [
    ["👕 Ropa", perfil?.talla_ropa],
    ["👟 Calzado", perfil?.talla_calzado],
    ["🎨 Colores", perfil?.colores_favoritos],
    ["💚 Le gusta", perfil?.me_gusta],
    ["🚫 No le gusta", perfil?.no_me_gusta],
  ].filter(([, v]) => v);

  return (
    <>
      <Tarjeta className={`text-center ${recienRevelado ? "animate-[aparecer_.5s_ease-out]" : ""}`}>
        <p className="text-sm text-stone-500">{recienRevelado ? "🎉 ¡Te tocó!" : "Te tocó regalarle a"}</p>
        <div className="mt-4 flex justify-center">
          <Avatar nombre={nombre} foto={perfil?.foto_url} tam={88} />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{nombre}</p>
        <p className="mt-1 text-sm text-stone-500">Presupuesto: {presupuesto(evento)}</p>
        <p className="mt-3 text-xs text-stone-400">🤫 Es secreto. Nadie más puede ver esto.</p>
      </Tarjeta>

      {!amigo.usuario_id ? (
        <Aviso tipo="info">{nombre} todavía no entra a la app. Cuando entre, aquí verás sus tallas y su lista de deseos.</Aviso>
      ) : null}

      {datos.length > 0 ? (
        <Desplegable titulo="Tallas y gustos" resumen={`${datos.length} ${datos.length === 1 ? "dato" : "datos"}`}>
          <dl className="space-y-2.5">
            {datos.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2 text-sm">
                <dt className="text-stone-500">{k}</dt>
                <dd className="text-stone-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Desplegable>
      ) : null}

      {amigo.usuario_id ? <ListaDeseos desplegable usuarioId={amigo.usuario_id} titulo={`Lista de deseos de ${nombre.split(" ")[0]}`} /> : null}
      <PreguntarAnonimo asignacionId={amigo.asignacion_id} nombre={nombre.split(" ")[0]} />
    </>
  );
}

function PreguntarAnonimo({ asignacionId, nombre }: { asignacionId: string; nombre: string }) {
  const [mensajes, setMensajes] = useState<MensajeSanta[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await createClient()
      .from("mensajes")
      .select("id, autor, texto, emoji, creado_en, pregunta:preguntas_predeterminadas(texto, emoji)")
      .eq("asignacion_id", asignacionId)
      .order("creado_en");
    setMensajes((data as unknown as MensajeSanta[]) ?? []);
  }, [asignacionId]);

  useEffect(() => {
    createClient()
      .from("preguntas_predeterminadas")
      .select("id, texto, emoji")
      .order("orden")
      .then(({ data }) => setPreguntas((data as Pregunta[]) ?? []));
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  async function enviar(valores: { pregunta_id?: number; emoji?: string }) {
    setError("");
    setEnviando(true);
    const { error } = await createClient().from("mensajes").insert({ asignacion_id: asignacionId, autor: "santa", ...valores });
    setEnviando(false);
    if (error) return setError(mensajeError(error));
    cargar();
  }

  return (
    <Desplegable
      titulo="Pregúntale en secreto"
      resumen={mensajes.length ? `${mensajes.length} ${mensajes.length === 1 ? "mensaje" : "mensajes"}` : null}
    >
      <p className="mb-4 text-sm text-stone-500">{nombre} no sabrá que eres tú.</p>

      {mensajes.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {mensajes.map((m) => (
            <Burbuja key={m.id} propia={m.autor === "santa"} fecha={m.creado_en}>
              {m.pregunta ? `${m.pregunta.emoji ?? ""} ${m.pregunta.texto}` : m.emoji ?? m.texto}
              {m.pregunta && m.texto ? <span className="block">{m.texto}</span> : null}
            </Burbuja>
          ))}
        </ul>
      ) : null}

      {error ? <div className="mb-3"><Aviso>{error}</Aviso></div> : null}

      <div className="flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            disabled={enviando}
            onClick={() => enviar({ emoji: e })}
            className="size-10 rounded-xl border border-stone-200 bg-white text-xl transition hover:bg-stone-100 active:scale-95"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {preguntas.map((p) => (
          <button
            key={p.id}
            disabled={enviando}
            onClick={() => enviar({ pregunta_id: p.id })}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left text-sm transition hover:bg-stone-100 active:scale-[0.99]"
          >
            {p.emoji} {p.texto}
          </button>
        ))}
      </div>
    </Desplegable>
  );
}

export function Burbuja({ propia, fecha, children }: { propia: boolean; fecha: string; children: React.ReactNode }) {
  return (
    <li className={`flex ${propia ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          propia ? "rounded-br-md bg-stone-900 text-white" : "rounded-bl-md bg-stone-100 text-stone-900"
        }`}
      >
        {children}
        <span className={`mt-0.5 block text-[10px] ${propia ? "text-stone-400" : "text-stone-500"}`}>{hora(fecha)}</span>
      </div>
    </li>
  );
}
