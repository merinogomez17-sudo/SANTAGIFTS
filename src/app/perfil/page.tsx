"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CambiarContrasena } from "@/components/CambiarContrasena";
import { AreaTexto, Aviso, Avatar, Boton, Campo, Cargando, Encabezado, Entrada, Pagina, Tarjeta, Titulo } from "@/components/ui";
import { useSesion } from "@/components/useSesion";
import { createClient } from "@/lib/supabase/client";
import type { Perfil } from "@/lib/tipos";
import { mensajeError, reducirImagen, rutaSegura } from "@/lib/utils";

type Form = Omit<Perfil, "id">;

const vacio: Form = {
  nombre: "",
  foto_url: null,
  talla_ropa: "",
  talla_calzado: "",
  colores_favoritos: "",
  me_gusta: "",
  no_me_gusta: "",
};

function EditorPerfil() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const { cargando, usuario, perfil, setPerfil } = useSesion({ requierePerfil: false });
  const [form, setForm] = useState<Form>(vacio);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const esNuevo = !perfil?.nombre;

  useEffect(() => {
    if (cargando || !usuario) return;
    const meta = usuario.user_metadata ?? {};
    const actual = (perfil ?? {}) as Partial<Form>;
    setForm({
      ...(Object.fromEntries((Object.keys(vacio) as (keyof Form)[]).map((k) => [k, actual[k] ?? ""])) as Form),
      nombre: perfil?.nombre || meta.full_name || meta.name || "",
      foto_url: perfil?.foto_url || meta.avatar_url || null,
    });
  }, [cargando, usuario, perfil]);

  if (cargando || !usuario) return <Cargando />;

  const cambiar = (campo: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !usuario) return;
    setSubiendo(true);
    setAviso(null);
    try {
      const imagen = await reducirImagen(f);
      const ruta = `${usuario.id}/foto-${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("santagifts-fotos").upload(ruta, imagen, { contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("santagifts-fotos").getPublicUrl(ruta);
      setForm((x) => ({ ...x, foto_url: data.publicUrl }));
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeError(err) });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setGuardando(true);
    setAviso(null);
    const limpio = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]),
    ) as Form;
    const { data, error } = await createClient()
      .from("perfiles")
      .upsert({ id: usuario.id, ...limpio, nombre: limpio.nombre ?? "" })
      .select()
      .single<Perfil>();
    setGuardando(false);
    if (error) return setAviso({ tipo: "error", texto: mensajeError(error) });
    setPerfil(data);
    if (next || esNuevo) return router.replace(rutaSegura(next));
    setAviso({ tipo: "ok", texto: "Perfil guardado" });
  }

  async function salir() {
    await createClient().auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <Encabezado foto={form.foto_url} nombre={form.nombre} />
      <Pagina>
        {esNuevo ? (
          <div className="space-y-1 pb-2">
            <h1 className="text-2xl font-semibold tracking-tight">¡Bienvenido! 👋</h1>
            <p className="text-sm text-stone-500">Cuéntanos de ti para que tu amigo secreto le atine.</p>
          </div>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
        )}

        <form onSubmit={guardar} className="space-y-4">
          <Tarjeta className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar nombre={form.nombre} foto={form.foto_url} tam={72} />
              <div className="space-y-1">
                <Boton type="button" variante="secundario" cargando={subiendo} onClick={() => archivo.current?.click()}>
                  {form.foto_url ? "Cambiar foto" : "Subir foto"}
                </Boton>
                <input ref={archivo} type="file" accept="image/*" hidden onChange={subirFoto} />
              </div>
            </div>
            <Campo etiqueta="Nombre">
              <Entrada required maxLength={80} placeholder="Como te dice la familia" value={form.nombre} onChange={cambiar("nombre")} />
            </Campo>
          </Tarjeta>

          <Tarjeta className="space-y-4">
            <Titulo>Para que te atinen</Titulo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Talla de ropa">
                <Entrada maxLength={30} placeholder="M, 32…" value={form.talla_ropa ?? ""} onChange={cambiar("talla_ropa")} />
              </Campo>
              <Campo etiqueta="Calzado">
                <Entrada maxLength={30} placeholder="26 MX" value={form.talla_calzado ?? ""} onChange={cambiar("talla_calzado")} />
              </Campo>
            </div>
            <Campo etiqueta="Colores favoritos">
              <Entrada maxLength={200} placeholder="Azul marino, verde…" value={form.colores_favoritos ?? ""} onChange={cambiar("colores_favoritos")} />
            </Campo>
            <Campo etiqueta="Me gusta">
              <AreaTexto maxLength={500} placeholder="Café, futbol, series de misterio…" value={form.me_gusta ?? ""} onChange={cambiar("me_gusta")} />
            </Campo>
            <Campo etiqueta="No me gusta">
              <AreaTexto maxLength={500} placeholder="Perfumes dulces, tazas…" value={form.no_me_gusta ?? ""} onChange={cambiar("no_me_gusta")} />
            </Campo>
          </Tarjeta>

          {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}
          <Boton className="w-full" cargando={guardando}>
            {esNuevo ? "Continuar" : "Guardar"}
          </Boton>
        </form>

        {!esNuevo ? (
          <>
            <Tarjeta>
              <Titulo>Lista de deseos</Titulo>
              <p className="-mt-2 text-sm text-stone-500">
                Cada intercambio tiene su propia lista. Ábrelo y ve a la pestaña <b>🙋 Yo</b> para agregar tus ideas.
              </p>
            </Tarjeta>
            <Tarjeta>
              <Titulo>Contraseña</Titulo>
              <p className="-mt-2 mb-4 text-sm text-stone-500">
                Ponle contraseña a tu cuenta ({usuario.email}) para entrar sin esperar el correo.
              </p>
              <CambiarContrasena />
            </Tarjeta>
            <Boton variante="fantasma" className="w-full" onClick={salir}>
              Cerrar sesión
            </Boton>
          </>
        ) : null}
      </Pagina>
    </>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <EditorPerfil />
    </Suspense>
  );
}
