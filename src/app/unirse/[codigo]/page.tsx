"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Aviso, Avatar, Boton, Cargando } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { fecha, mensajeError, presupuesto } from "@/lib/utils";

type Invitacion = {
  evento_id: string;
  nombre: string;
  fecha_evento: string | null;
  lugar: string | null;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  moneda: string;
  organizador_nombre: string;
  organizador_foto: string | null;
  estado: string;
};

type Lugar = { participante_id: string; nombre: string };

export default function UnirsePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Unirse />
    </Suspense>
  );
}

function Unirse() {
  const { codigo } = useParams<{ codigo: string }>();
  const router = useRouter();
  const aqui = `/unirse/${codigo}`;
  const [inv, setInv] = useState<Invitacion | null | undefined>(undefined);
  // null = falta iniciar sesión o perfil; array = ya puede elegir
  const [lugares, setLugares] = useState<Lugar[] | null>(null);
  const [falta, setFalta] = useState<"sesion" | "perfil" | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("ver_invitacion", { p_codigo: codigo });
    const invitacion = ((data as Invitacion[] | null) ?? [])[0] ?? null;
    setInv(invitacion);
    if (!invitacion) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setFalta("sesion");
    const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle<{ nombre: string }>();
    if (!perfil?.nombre) return setFalta("perfil");

    // Si ya estoy dentro, me voy directo al evento
    const { data: yo } = await supabase
      .from("participantes")
      .select("id")
      .eq("evento_id", invitacion.evento_id)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (yo) return router.replace(`/eventos/${invitacion.evento_id}`);

    const { data: libres } = await supabase.rpc("lugares_disponibles", { p_codigo: codigo });
    setFalta(null);
    setLugares((libres as Lugar[] | null) ?? []);
  }, [codigo, router]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function confirmar() {
    if (!elegido) return;
    setError("");
    setCargando(true);
    const supabase = createClient();
    const { data, error } =
      elegido === "nuevo"
        ? await supabase.rpc("unirse_con_codigo", { p_codigo: codigo })
        : await supabase.rpc("reclamar_lugar", { p_codigo: codigo, p_participante: elegido });
    setCargando(false);
    if (error) {
      setError(mensajeError(error));
      setElegido(null);
      return cargar();
    }
    router.replace(`/eventos/${data}`);
  }

  if (inv === undefined) return <Cargando />;

  if (inv === null)
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-2 px-4 py-12 text-center">
        <div className="text-4xl">🤷</div>
        <h1 className="text-xl font-semibold">Esta invitación no existe</h1>
        <p className="text-sm text-stone-500">Pide a quien organiza que te mande el link de nuevo.</p>
      </main>
    );

  const terminado = inv.estado === "terminado";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Avatar nombre={inv.organizador_nombre} foto={inv.organizador_foto} tam={64} />
        </div>
        <p className="text-sm text-stone-500">{inv.organizador_nombre} te invita a</p>
        <h1 className="text-2xl font-semibold tracking-tight">{inv.nombre}</h1>
        <div className="space-y-1 text-sm text-stone-600">
          <p>📅 {fecha(inv.fecha_evento)}</p>
          {inv.lugar ? <p>📍 {inv.lugar}</p> : null}
          <p>💰 {presupuesto(inv)}</p>
        </div>
      </div>

      {error ? <Aviso>{error}</Aviso> : null}

      {terminado ? (
        <Aviso tipo="info">Este intercambio ya terminó.</Aviso>
      ) : falta ? (
        <Boton
          className="h-12 w-full"
          onClick={() => router.push(`${falta === "sesion" ? "/entrar" : "/perfil"}?next=${encodeURIComponent(aqui)}`)}
        >
          {falta === "sesion" ? "Entrar para unirme 🎁" : "Completar mi perfil"}
        </Boton>
      ) : lugares === null ? (
        <Cargando />
      ) : (
        <div className="space-y-3">
          <p className="text-center font-medium">¿Quién eres?</p>
          <ul className="space-y-2">
            {lugares.map((l) => (
              <li key={l.participante_id}>
                <button
                  onClick={() => setElegido(l.participante_id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    elegido === l.participante_id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <Avatar nombre={l.nombre} tam={32} />
                  <span className="text-sm font-medium">{l.nombre}</span>
                </button>
              </li>
            ))}
            {inv.estado === "abierto" ? (
              <li>
                <button
                  onClick={() => setElegido("nuevo")}
                  className={`w-full rounded-xl border border-dashed px-3 py-3 text-sm transition ${
                    elegido === "nuevo" ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  No estoy en la lista, agrégame
                </button>
              </li>
            ) : null}
          </ul>
          {lugares.length === 0 && inv.estado !== "abierto" ? (
            <Aviso tipo="info">Ya no hay lugares libres. Pídele a {inv.organizador_nombre} que te agregue.</Aviso>
          ) : null}
          <Boton className="h-12 w-full" disabled={!elegido} cargando={cargando} onClick={confirmar}>
            {elegido === "nuevo" ? "Unirme" : "Sí, soy yo"}
          </Boton>
        </div>
      )}
    </main>
  );
}
