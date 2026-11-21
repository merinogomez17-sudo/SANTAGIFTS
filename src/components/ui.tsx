"use client";

import Link from "next/link";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const estilos: Record<Variante, string> = {
  primario: "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300",
  secundario: "bg-white text-stone-900 border border-stone-200 hover:bg-stone-100 disabled:text-stone-400",
  fantasma: "text-stone-600 hover:bg-stone-100 disabled:text-stone-300",
  peligro: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:text-rose-300",
};

export function Boton({
  variante = "primario",
  className = "",
  cargando,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || cargando}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
    >
      {cargando ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-700">{etiqueta}</span>
      {children}
      {ayuda ? <span className="block text-xs text-stone-500">{ayuda}</span> : null}
    </label>
  );
}

const claseEntrada =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${claseEntrada} ${props.className ?? ""}`} />;
}

export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${claseEntrada} resize-none ${props.className ?? ""}`} />;
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-stone-200 bg-white p-5 ${className}`}>{children}</section>;
}

/** Tarjeta que se abre y se cierra tocando su título. `resumen` se ve al lado del título. */
export function Desplegable({
  titulo,
  resumen,
  abierta = false,
  children,
}: {
  titulo: ReactNode;
  resumen?: ReactNode;
  abierta?: boolean;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(abierta);
  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <h2 className="min-w-0 flex-1 text-base font-semibold text-stone-900">{titulo}</h2>
        {resumen ? <span className="shrink-0 text-xs text-stone-500">{resumen}</span> : null}
        <span className={`shrink-0 text-stone-400 transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {abierto ? <div className="px-5 pb-5">{children}</div> : null}
    </section>
  );
}

/** Pestañas tipo "píldora" para separar secciones de una pantalla. */
export function Pestanas<T extends string>({
  opciones,
  valor,
  alCambiar,
}: {
  opciones: { id: T; texto: ReactNode; aviso?: boolean }[];
  valor: T;
  alCambiar: (v: T) => void;
}) {
  return (
    <div role="tablist" className="sticky top-14 z-[5] -mx-4 flex gap-1 bg-background/90 px-4 py-2 backdrop-blur">
      <div className="flex w-full gap-1 rounded-xl bg-stone-100 p-1">
        {opciones.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={valor === o.id}
            onClick={() => alCambiar(o.id)}
            className={`relative flex-1 rounded-lg px-2 py-2 text-sm font-medium transition ${
              valor === o.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {o.texto}
            {o.aviso ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-acento" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-stone-900">{children}</h2>
      {accion}
    </div>
  );
}

export function Avatar({ nombre, foto, tam = 40 }: { nombre?: string | null; foto?: string | null; tam?: number }) {
  const inicial = (nombre?.trim()?.[0] ?? "?").toUpperCase();
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={foto}
      alt={nombre ?? ""}
      width={tam}
      height={tam}
      className="shrink-0 rounded-full object-cover"
      style={{ width: tam, height: tam }}
    />
  ) : (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-stone-200 font-semibold text-stone-600"
      style={{ width: tam, height: tam, fontSize: tam * 0.4 }}
    >
      {inicial}
    </span>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "ok" | "info"; children: ReactNode }) {
  const c = {
    error: "bg-rose-50 text-rose-700 border-rose-100",
    ok: "bg-emerald-50 text-emerald-700 border-emerald-100",
    info: "bg-stone-100 text-stone-700 border-stone-200",
  }[tipo];
  return <p className={`rounded-xl border px-3.5 py-2.5 text-sm ${c}`}>{children}</p>;
}

export function Cargando() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <span className="size-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
    </div>
  );
}

export function Encabezado({ foto, nombre }: { foto?: string | null; nombre?: string | null }) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/eventos" className="text-sm font-bold tracking-[0.18em] text-stone-900">
          SANTA<span className="text-acento">GIFTS</span>
        </Link>
        <Link href="/perfil" aria-label="Mi perfil">
          <Avatar nombre={nombre} foto={foto} tam={32} />
        </Link>
      </div>
    </header>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">{children}</main>;
}

export function Proximamente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-stone-900">{titulo}</h3>
        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white">Próximamente</span>
      </div>
      <p className="mt-1.5 text-sm text-stone-500">{texto}</p>
    </div>
  );
}
