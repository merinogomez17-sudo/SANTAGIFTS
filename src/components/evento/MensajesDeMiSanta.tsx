"use client";

import { useCallback, useEffect, useState } from "react";
import { Burbuja } from "@/components/evento/AmigoSecreto";
import { Aviso, Boton, Desplegable, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { MensajeRecibido, RespuestaRapida } from "@/lib/tipos";
import { EMOJIS, mensajeError } from "@/lib/utils";

/** Lo que ve quien recibe: las preguntas de su amigo secreto (anónimo) y cómo contestarle. */
export function MensajesDeMiSanta({ eventoId }: { eventoId: string }) {
  const [mensajes, setMensajes] = useState<MensajeRecibido[]>([]);
  const [rapidas, setRapidas] = useState<RespuestaRapida[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("mensajes_de_mi_santa", { p_evento: eventoId });
    const lista = (data as MensajeRecibido[] | null) ?? [];
    setMensajes(lista);
    if (lista.some((m) => m.autor === "santa" && !m.leido_en)) await supabase.rpc("marcar_leidos", { p_evento: eventoId });
  }, [eventoId]);

  useEffect(() => {
    createClient()
      .from("respuestas_rapidas")
      .select("id, texto")
      .order("orden")
      .then(({ data }) => setRapidas((data as RespuestaRapida[]) ?? []));
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  async function responder(valores: { texto?: string; emoji?: string }) {
    setError("");
    setEnviando(true);
    const { error } = await createClient().rpc("responder_a_mi_santa", {
      p_evento: eventoId,
      p_texto: valores.texto ?? null,
      p_emoji: valores.emoji ?? null,
    });
    setEnviando(false);
    if (error) return setError(mensajeError(error));
    setTexto("");
    cargar();
  }

  const hayPreguntas = mensajes.some((m) => m.autor === "santa");

  return (
    <Desplegable
      titulo="Preguntas de quien te sacó 🤫"
      resumen={hayPreguntas ? `${mensajes.length} ${mensajes.length === 1 ? "mensaje" : "mensajes"}` : "Sin preguntas"}
    >
      {!hayPreguntas ? (
        <p className="text-sm text-stone-500">Aquí verás lo que te pregunte tu amigo secreto. Tú no sabrás quién es.</p>
      ) : (
        <>
          <ul className="mb-4 space-y-2">
            {mensajes.map((m) => (
              <Burbuja key={m.mensaje_id} propia={m.autor === "festejado"} fecha={m.creado_en}>
                {m.pregunta ? `${m.pregunta_emoji ?? ""} ${m.pregunta}` : m.emoji ?? m.texto}
                {m.pregunta && m.texto ? <span className="block">{m.texto}</span> : null}
              </Burbuja>
            ))}
          </ul>

          {error ? <div className="mb-3"><Aviso>{error}</Aviso></div> : null}

          <div className="flex flex-wrap gap-1.5">
            {rapidas.map((r) => (
              <button
                key={r.id}
                disabled={enviando}
                onClick={() => responder({ texto: r.texto })}
                className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm transition hover:bg-stone-100 active:scale-95"
              >
                {r.texto}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                disabled={enviando}
                onClick={() => responder({ emoji: e })}
                className="size-10 rounded-xl border border-stone-200 bg-white text-xl transition hover:bg-stone-100 active:scale-95"
              >
                {e}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (texto.trim()) responder({ texto: texto.trim() });
            }}
          >
            <Entrada maxLength={500} placeholder="Escribe tu respuesta…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <Boton cargando={enviando} disabled={!texto.trim()}>
              Enviar
            </Boton>
          </form>
        </>
      )}
    </Desplegable>
  );
}
