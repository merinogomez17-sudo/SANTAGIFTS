import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Recibe un link de Amazon y regresa título, foto y precio del producto,
 * consultando Canopy API (https://docs.canopyapi.co). Cada llamada gasta
 * una consulta del plan, por eso solo se usa al agregar un deseo.
 */

// amazon.com.mx → MX, amazon.com → US, amazon.co.uk → UK…
const DOMINIOS: Record<string, string> = {
  "amazon.com.mx": "MX",
  "amazon.com": "US",
  "amazon.ca": "CA",
  "amazon.co.uk": "UK",
  "amazon.de": "DE",
  "amazon.fr": "FR",
  "amazon.it": "IT",
  "amazon.es": "ES",
  "amazon.com.br": "BR",
  "amazon.co.jp": "JP",
  "amazon.in": "IN",
  "amazon.com.au": "AU",
};
const CORTOS = ["a.co", "amzn.to", "amzn.eu", "amzn.asia"];

function hostAmazon(host: string) {
  const h = host.toLowerCase().replace(/^(www|m|smile)\./, "");
  return Object.keys(DOMINIOS).find((d) => h === d) ?? null;
}

function esCorto(host: string) {
  return CORTOS.includes(host.toLowerCase().replace(/^www\./, ""));
}

function asinDe(url: URL) {
  const m = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/asin|o\/asin)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

/** Sigue los links cortos (a.co/d/…) solo mientras sigan siendo de Amazon. */
async function resolver(link: string) {
  let url = new URL(link);
  for (let i = 0; i < 4 && esCorto(url.hostname); i++) {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const destino = r.headers.get("location");
    if (!destino) return null;
    url = new URL(destino, url);
    if (url.protocol !== "https:" || !(esCorto(url.hostname) || hostAmazon(url.hostname))) return null;
  }
  return hostAmazon(url.hostname) ? url : null;
}

type Producto = { titulo: string | null; imagen: string | null; precio: number | null; moneda: string | null };

// La forma exacta de la respuesta no viene en la documentación; buscamos en los lugares probables.
function leer(json: unknown): Producto {
  const raiz = json as Record<string, unknown> | null;
  const datos = (raiz?.data as Record<string, unknown> | undefined) ?? raiz ?? {};
  const p = ((datos.amazonProduct ?? datos.product ?? datos) as Record<string, unknown>) ?? {};
  const imgs = (p.imageUrls ?? p.images) as unknown;
  const primera = Array.isArray(imgs) ? imgs.find((x) => typeof x === "string") : null;
  const imagen = [p.mainImageUrl, p.imageUrl, p.image, primera].find((x) => typeof x === "string" && x.startsWith("https://")) as
    | string
    | undefined;
  const precio = (p.price ?? null) as Record<string, unknown> | number | null;
  const valor = typeof precio === "number" ? precio : typeof precio?.value === "number" ? precio.value : null;
  const moneda = typeof precio === "object" && typeof precio?.currency === "string" ? precio.currency : null;
  return {
    titulo: typeof p.title === "string" ? p.title.slice(0, 300) : null,
    imagen: imagen && imagen.length <= 1000 ? imagen : null,
    precio: valor,
    moneda,
  };
}

export async function POST(request: NextRequest) {
  const clave = process.env.CANOPY_API_KEY;
  if (!clave) return NextResponse.json({ error: "sin_configurar" }, { status: 501 });

  // Solo usuarios con sesión, para que nadie más gaste las consultas.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sin_sesion" }, { status: 401 });

  let link = "";
  try {
    link = String(((await request.json()) as { url?: unknown }).url ?? "");
  } catch {
    return NextResponse.json({ error: "datos" }, { status: 400 });
  }

  let url: URL | null;
  try {
    url = await resolver(link);
  } catch {
    url = null;
  }
  const asin = url ? asinDe(url) : null;
  if (!url || !asin) return NextResponse.json({ error: "no_amazon" }, { status: 422 });

  const dominio = DOMINIOS[hostAmazon(url.hostname)!];
  const r = await fetch(`https://rest.canopyapi.co/api/amazon/product?asin=${asin}&domain=${dominio}`, {
    headers: { "API-KEY": clave, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!r?.ok) {
    console.error("Canopy", r?.status, r ? (await r.text()).slice(0, 300) : "sin respuesta");
    return NextResponse.json({ error: "canopy" }, { status: 502 });
  }

  const producto = leer(await r.json());
  return NextResponse.json({ ...producto, asin, link: `https://${url.hostname}/dp/${asin}` });
}
