"use client";

import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/tipos";

type Estado = { cargando: boolean; usuario: User | null; perfil: Perfil | null };

/**
 * Revisa que haya sesión. Si no hay, manda a /entrar.
 * Con requierePerfil, si la persona aún no pone su nombre, la manda a /perfil.
 */
export function useSesion({ requierePerfil = true }: { requierePerfil?: boolean } = {}) {
  const router = useRouter();
  const ruta = usePathname();
  const [estado, setEstado] = useState<Estado>({ cargando: true, usuario: null, perfil: null });

  useEffect(() => {
    let activo = true;
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/entrar?next=${encodeURIComponent(ruta)}`);
        return;
      }
      const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).maybeSingle<Perfil>();
      if (requierePerfil && !perfil?.nombre) {
        router.replace(`/perfil?next=${encodeURIComponent(ruta)}`);
        return;
      }
      if (activo) setEstado({ cargando: false, usuario: user, perfil: perfil ?? null });
    })();
    return () => {
      activo = false;
    };
  }, [router, ruta, requierePerfil]);

  return { ...estado, setPerfil: (perfil: Perfil) => setEstado((e) => ({ ...e, perfil })) };
}
