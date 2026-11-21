"use client";

import { useRouter } from "next/navigation";
import { FormularioEvento } from "@/components/FormularioEvento";
import { Cargando, Encabezado, Pagina } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/utils";

export default function NuevoEventoPage() {
  const router = useRouter();
  const { cargando, usuario, perfil } = useSesion();

  if (cargando || !usuario) return <Cargando />;

  return (
    <>
      <Encabezado foto={perfil?.foto_url} nombre={perfil?.nombre} />
      <Pagina>
        <h1 className="pb-2 text-2xl font-semibold tracking-tight">Nuevo intercambio</h1>
        <FormularioEvento
          textoBoton="Crear intercambio"
          alGuardar={async (datos) => {
            const { data, error } = await createClient()
              .from("eventos")
              .insert({ organizador_id: usuario.id, ...datos })
              .select("id")
              .single<{ id: string }>();
            if (error) return mensajeError(error);
            router.replace(`/eventos/${data.id}`);
          }}
        />
      </Pagina>
    </>
  );
}
