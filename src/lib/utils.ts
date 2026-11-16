import type { Evento } from "./tipos";

export const EMOJIS = ["🎁", "😄", "😂", "🤔", "❤️", "🎄", "👍", "🙏", "✨", "🤫"];

export function dinero(n: number | null | undefined, moneda = "MXN") {
  if (n == null) return "";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
}

export function presupuesto(e: Pick<Evento, "presupuesto_min" | "presupuesto_max" | "moneda">) {
  const { presupuesto_min: min, presupuesto_max: max, moneda } = e;
  if (min != null && max != null) return `${dinero(min, moneda)} – ${dinero(max, moneda)}`;
  if (max != null) return `Hasta ${dinero(max, moneda)}`;
  if (min != null) return `Desde ${dinero(min, moneda)}`;
  return "Sin presupuesto definido";
}

export function fecha(iso: string | null) {
  if (!iso) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function hora(iso: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

// Solo permite regresar a rutas internas (evita redirecciones a otros sitios)
export function rutaSegura(next: string | null | undefined, porDefecto = "/eventos") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return porDefecto;
  return next;
}

export function mensajeError(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Algo salió mal, intenta de nuevo";
}

// Reduce la foto a 512px y la convierte a JPEG para que pese poco
export async function reducirImagen(archivo: File, lado = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.85),
  );
}
