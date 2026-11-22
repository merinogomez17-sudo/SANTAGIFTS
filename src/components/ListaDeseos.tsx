"use client";

import { useCallback, useEffect, useState } from "react";
import { Aviso, Boton, Desplegable, Entrada, Proximamente, Tarjeta, Titulo } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Deseo } from "@/lib/tipos";
import { dinero, mensajeError } from "@/lib/utils";

function linkSeguro(link: string | null) {
  if (!link) return null;
  try {
    const u = new URL(link);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * Saca el link de lo que pegó la persona. Las apps (Shein, Amazon, Mercado Libre…)
 * al "Compartir" mandan texto + link; aquí nos quedamos solo con el link.
 */
function extraerLink(texto: string) {
  const t = texto.trim();
  if (!t) return "";
  const conProtocolo = t.match(/https?:\/\/[^\s<>"']+/i);
  if (conProtocolo) return conProtocolo[0];
  const sinProtocolo = t.match(/(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/[^\s<>"']*/i) ?? t.match(/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i);
  return sinProtocolo ? `https://${sinProtocolo[0]}` : t;
}

type Tienda = { nombre: string; clase: string };

const TIENDAS: { dominios: string[]; tienda: Tienda }[] = [
  { dominios: ["amazon.", "amzn.", "a.co"], tienda: { nombre: "Amazon", clase: "bg-amber-50 text-amber-800 border-amber-200" } },
  { dominios: ["mercadolibre.", "mercadolivre.", "meli.la"], tienda: { nombre: "Mercado Libre", clase: "bg-yellow-50 text-yellow-800 border-yellow-200" } },
  { dominios: ["shein."], tienda: { nombre: "Shein", clase: "bg-stone-900 text-white border-stone-900" } },
  { dominios: ["liverpool."], tienda: { nombre: "Liverpool", clase: "bg-pink-50 text-pink-800 border-pink-200" } },
  { dominios: ["walmart."], tienda: { nombre: "Walmart", clase: "bg-sky-50 text-sky-800 border-sky-200" } },
  { dominios: ["coppel."], tienda: { nombre: "Coppel", clase: "bg-yellow-50 text-blue-800 border-yellow-200" } },
  { dominios: ["temu."], tienda: { nombre: "Temu", clase: "bg-orange-50 text-orange-800 border-orange-200" } },
  { dominios: ["aliexpress."], tienda: { nombre: "AliExpress", clase: "bg-red-50 text-red-800 border-red-200" } },
  { dominios: ["sears."], tienda: { nombre: "Sears", clase: "bg-blue-50 text-blue-800 border-blue-200" } },
  { dominios: ["palaciodehierro."], tienda: { nombre: "El Palacio de Hierro", clase: "bg-stone-100 text-stone-800 border-stone-200" } },
];

function tiendaDe(url: string): Tienda {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  // "amazon." = cualquier país (amazon.com.mx, amazon.com); "a.co" = dominio exacto (o subdominio)
  const coincide = (d: string) =>
    d.endsWith(".") ? host.startsWith(d) || host.includes(`.${d}`) : host === d || host.endsWith(`.${d}`);
  const t = TIENDAS.find(({ dominios }) => dominios.some(coincide));
  return t?.tienda ?? { nombre: host.split(".").slice(-2, -1)[0] || host, clase: "bg-white text-stone-700 border-stone-200" };
}

type Producto = { titulo: string | null; imagen: string | null; precio: number | null; moneda: string | null; link?: string };

/** Solo mostramos fotos servidas por Amazon, para que nadie pueda meter imágenes de otros sitios. */
function imagenSegura(src: string | null) {
  if (!src) return null;
  try {
    const u = new URL(src);
    const ok = u.protocol === "https:" && /(^|\.)(media-amazon\.com|ssl-images-amazon\.com|images-amazon\.com)$/.test(u.hostname);
    return ok ? u.href : null;
  } catch {
    return null;
  }
}

function BotonTienda({ url }: { url: string }) {
  const t = tiendaDe(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${t.clase}`}
    >
      Ver en {t.nombre} <span aria-hidden>↗</span>
    </a>
  );
}

/** Lista de deseos de una persona para un intercambio. Con `editable` se puede agregar y borrar. */
export function ListaDeseos({
  usuarioId,
  eventoId,
  editable,
  titulo = "Mi lista de deseos",
  nota,
  desplegable,
}: {
  usuarioId: string;
  /** Cada intercambio tiene su propia lista. */
  eventoId: string;
  editable?: boolean;
  titulo?: string;
  nota?: string;
  /** Muestra la lista dentro de una tarjeta que se abre y se cierra. */
  desplegable?: boolean;
}) {
  const [deseos, setDeseos] = useState<Deseo[] | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [link, setLink] = useState("");
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await createClient()
      .from("deseos")
      .select("*")
      .eq("usuario_id", usuarioId)
      .eq("evento_id", eventoId)
      .order("creado_en", { ascending: true });
    setDeseos((data as Deseo[]) ?? []);
  }, [usuarioId, eventoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let l = extraerLink(link);
    if (l && !linkSeguro(l)) return setError("No reconocí ese link. Cópialo desde el botón Compartir de la tienda y pégalo aquí.");
    if (!l && !descripcion.trim()) return setError("Escribe qué te gustaría o pega un link.");
    setGuardando(true);

    // Si es de Amazon, pedimos título, foto y precio al servidor (Canopy API).
    let prod: Producto | null = null;
    if (l && tiendaDe(l).nombre === "Amazon") {
      prod = await fetch("/api/producto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: l }) })
        .then((r) => (r.ok ? (r.json() as Promise<Producto>) : null))
        .catch(() => null);
      if (prod?.link) l = prod.link;
    }

    const texto = descripcion.trim() || prod?.titulo || `Algo de ${tiendaDe(l).nombre}`;
    const precioAuto = !precio && prod?.precio != null && (!prod.moneda || prod.moneda === "MXN") ? Math.round(prod.precio) : null;
    const { error } = await createClient()
      .from("deseos")
      .insert({
        usuario_id: usuarioId,
        evento_id: eventoId,
        descripcion: texto.slice(0, 300),
        link: l || null,
        precio_aprox: precio ? Number(precio) : precioAuto,
        imagen_url: imagenSegura(prod?.imagen ?? null),
      });
    setGuardando(false);
    if (error) return setError(mensajeError(error));
    setDescripcion("");
    setLink("");
    setPrecio("");
    cargar();
  }

  async function borrar(id: string) {
    await createClient().from("deseos").delete().eq("id", id);
    cargar();
  }

  const contenido = (
    <>
      {nota ? <p className={`${desplegable ? "" : "-mt-2"} mb-4 text-sm text-stone-500`}>{nota}</p> : null}
      {deseos === null ? (
        <p className="text-sm text-stone-400">Cargando…</p>
      ) : deseos.length === 0 ? (
        <p className="text-sm text-stone-500">{editable ? "Agrega al menos 3 ideas para ayudarle a tu amigo secreto." : "Todavía no agrega deseos."}</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {deseos.map((d) => {
            const url = linkSeguro(d.link);
            const img = imagenSegura(d.imagen_url);
            return (
              <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-16 shrink-0 rounded-xl border border-stone-100 bg-white object-contain p-1" />
                ) : (
                  <span className="mt-0.5 text-lg">🎁</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 text-sm text-stone-900">{d.descripcion}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-stone-500">
                    {d.precio_aprox != null ? <span>~{dinero(d.precio_aprox)}</span> : null}
                  </div>
                  {url ? <BotonTienda url={url} /> : null}
                </div>
                {editable ? (
                  <button onClick={() => borrar(d.id)} className="text-xs text-stone-400 hover:text-rose-600" aria-label="Borrar">
                    Quitar
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {editable ? (
        <form onSubmit={agregar} className="mt-4 space-y-3 border-t border-stone-100 pt-4">
          <Entrada maxLength={300} placeholder="¿Qué te gustaría? (con link de Amazon se llena solo)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Entrada inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="Pega el link (opcional)" value={link} onChange={(e) => setLink(e.target.value)} />
            <Entrada type="number" inputMode="numeric" min={0} placeholder="$ aprox" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          </div>
          {linkSeguro(extraerLink(link)) ? (
            <p className="-mt-1 text-xs text-stone-500">
              Link de <span className="font-medium text-stone-800">{tiendaDe(extraerLink(link)).nombre}</span> ✓
            </p>
          ) : (
            <p className="-mt-1 text-xs text-stone-400">Amazon, Mercado Libre, Shein, Liverpool… Usa el botón Compartir de la app y pégalo aquí.</p>
          )}
          {error ? <Aviso>{error}</Aviso> : null}
          <Boton variante="secundario" className="w-full" cargando={guardando}>
            {guardando && tiendaDe(extraerLink(link) || "https://x.invalid").nombre === "Amazon" ? "Buscando producto…" : "Agregar a mi lista"}
          </Boton>
          <Proximamente titulo="Tienda de regalos" texto="Pronto podrás buscar regalos de Mercado Libre y Amazon dentro de tu presupuesto." />
        </form>
      ) : null}
    </>
  );

  if (desplegable)
    return (
      <Desplegable titulo={titulo} resumen={deseos ? (deseos.length === 1 ? "1 deseo" : `${deseos.length} deseos`) : null}>
        {contenido}
      </Desplegable>
    );

  return (
    <Tarjeta>
      <Titulo>{titulo}</Titulo>
      {contenido}
    </Tarjeta>
  );
}
