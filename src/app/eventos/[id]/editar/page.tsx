"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FormularioEvento } from "@/components/FormularioEvento";
import { Cargando, Encabezado, Pagina } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import type { Evento } from "@/lib/tipos";
import { mensajeError } from "@/lib/utils";

export default function EditarEventoPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Editar />
    </Suspense>
  );
}

function Editar() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { cargando, usuario, perfil } = useSesion();
  const [evento, setEvento] = useState<Evento | null | undefined>(undefined);

  useEffect(() => {
    if (!usuario) return;
    createClient()
      .from("eventos")
      .select("*")
      .eq("id", id)
      .maybeSingle<Evento>()
      .then(({ data }) => setEvento(data ?? null));
  }, [id, usuario]);

  if (cargando || !usuario || evento === undefined) return <Cargando />;

  const volver = `/eventos/${id}`;

  return (
    <>
      <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
      <Pagina>
        <Link href={volver} className="text-sm text-stone-500 hover:text-stone-900">
          ← Volver
        </Link>
        {!evento || evento.organizador_id !== usuario.id ? (
          <p className="py-16 text-center text-stone-500">Solo quien organiza puede editar este intercambio.</p>
        ) : (
          <>
            <h1 className="pb-2 text-2xl font-semibold tracking-tight">Editar intercambio</h1>
            <FormularioEvento
              inicial={evento}
              textoBoton="Guardar cambios"
              alGuardar={async (datos) => {
                const { error } = await createClient().from("eventos").update(datos).eq("id", id);
                if (error) return mensajeError(error);
                router.replace(volver);
              }}
            />
          </>
        )}
      </Pagina>
    </>
  );
}
