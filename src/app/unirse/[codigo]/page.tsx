"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  const [inv, setInv] = useState<Invitacion | null | undefined>(undefined);
  const [uniendo, setUniendo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .rpc("ver_invitacion", { p_codigo: codigo })
      .then(({ data }) => setInv(((data as Invitacion[] | null) ?? [])[0] ?? null));
  }, [codigo]);

  async function unirme() {
    setError("");
    setUniendo(true);
    const supabase = createClient();
    const aqui = `/unirse/${codigo}`;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push(`/entrar?next=${encodeURIComponent(aqui)}`);
    const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", user.id).maybeSingle<{ nombre: string }>();
    if (!perfil?.nombre) return router.push(`/perfil?next=${encodeURIComponent(aqui)}`);
    const { data, error } = await supabase.rpc("unirse_con_codigo", { p_codigo: codigo });
    setUniendo(false);
    if (error) return setError(mensajeError(error));
    router.replace(`/eventos/${data}`);
  }

  if (inv === undefined) return <Cargando />;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      {inv === null ? (
        <div className="space-y-2 text-center">
          <div className="text-4xl">🤷</div>
          <h1 className="text-xl font-semibold">Esta invitación no existe</h1>
          <p className="text-sm text-stone-500">Pide a quien organiza que te mande el link de nuevo.</p>
        </div>
      ) : (
        <>
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
          {inv.estado === "abierto" ? (
            <Boton className="h-12 w-full" cargando={uniendo} onClick={unirme}>
              Unirme al intercambio 🎁
            </Boton>
          ) : (
            <Aviso tipo="info">Este intercambio ya hizo su sorteo, ya no se puede entrar.</Aviso>
          )}
        </>
      )}
    </main>
  );
}
