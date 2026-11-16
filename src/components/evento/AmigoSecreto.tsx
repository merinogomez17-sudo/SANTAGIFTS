"use client";

import { useCallback, useEffect, useState } from "react";
import { ListaDeseos } from "@/components/ListaDeseos";
import { Aviso, Avatar, Proximamente, Tarjeta, Titulo } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Evento, MensajeSanta, Perfil, Pregunta } from "@/lib/tipos";
import { EMOJIS, hora, mensajeError, presupuesto } from "@/lib/utils";

/** Lo que ve quien regala: a quién le tocó, sus datos, su lista y el chat para preguntarle. */
export function AmigoSecreto({ evento }: { evento: Evento }) {
  const [asignacion, setAsignacion] = useState<{ id: string; recibe_id: string } | null | undefined>(undefined);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: a } = await supabase
        .from("asignaciones")
        .select("id, recibe_id")
        .eq("evento_id", evento.id)
        .maybeSingle<{ id: string; recibe_id: string }>();
      if (a) {
        const { data: p } = await supabase.from("perfiles").select("*").eq("id", a.recibe_id).maybeSingle<Perfil>();
        setPerfil(p ?? null);
      }
      setAsignacion(a ?? null);
    })();
  }, [evento.id, evento.sorteado_en]);

  if (asignacion === undefined) return null;
  if (asignacion === null) return <Aviso tipo="info">No participaste en este sorteo.</Aviso>;

  const datos = [
    ["👕 Ropa", perfil?.talla_ropa],
    ["👟 Calzado", perfil?.talla_calzado],
    ["🎨 Colores", perfil?.colores_favoritos],
    ["💚 Le gusta", perfil?.me_gusta],
    ["🚫 No le gusta", perfil?.no_me_gusta],
  ].filter(([, v]) => v);

  return (
    <>
      <Tarjeta className="text-center">
        <p className="text-sm text-stone-500">Te tocó regalarle a</p>
        <div className="mt-4 flex justify-center">
          <Avatar nombre={perfil?.nombre} foto={perfil?.foto_url} tam={88} />
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight">{perfil?.nombre}</p>
        <p className="mt-1 text-sm text-stone-500">Presupuesto: {presupuesto(evento)}</p>
        <p className="mt-3 text-xs text-stone-400">🤫 Es secreto. Nadie más puede ver esto.</p>
      </Tarjeta>

      {datos.length > 0 ? (
        <Tarjeta>
          <Titulo>Lo que sabemos</Titulo>
          <dl className="space-y-2.5">
            {datos.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2 text-sm">
                <dt className="text-stone-500">{k}</dt>
                <dd className="text-stone-900">{v}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
      ) : null}

      <ListaDeseos usuarioId={asignacion.recibe_id} titulo={`Lista de deseos de ${perfil?.nombre?.split(" ")[0] ?? ""}`} />
      <Proximamente titulo="Ideas de regalo" texto="Pronto verás sugerencias de Mercado Libre y Amazon dentro del presupuesto." />
      <PreguntarAnonimo asignacionId={asignacion.id} nombre={perfil?.nombre?.split(" ")[0] ?? ""} />
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
    <Tarjeta>
      <Titulo>Pregúntale en secreto</Titulo>
      <p className="-mt-2 mb-4 text-sm text-stone-500">{nombre} no sabrá que eres tú.</p>

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
    </Tarjeta>
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
