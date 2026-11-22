"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const CLAVE = "santagifts-instalar-oculto";

function leerOculto() {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
}

/**
 * Aviso para instalar SANTAGIFTS en el celular.
 * Android/Chrome: botón que abre la instalación. iPhone: instrucciones (Safari no permite botón).
 */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [esIphone, setEsIphone] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pasos, setPasos] = useState(false);

  useEffect(() => {
    const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (instalada || leerOculto()) return;

    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (ios) {
      setEsIphone(true);
      setVisible(true);
    }

    const alPoder = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      setVisible(true);
    };
    const alInstalar = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", alPoder);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPoder);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  function ocultar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {}
    setVisible(false);
  }

  async function instalar() {
    if (evento) {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      setEvento(null);
      if (outcome === "accepted") setVisible(false);
    } else {
      setPasos((p) => !p);
    }
  }

  if (!visible) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/iconos/icono-192.png" alt="" className="size-12 shrink-0 rounded-xl border border-stone-100" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">Instala SantaGifts</p>
          <p className="text-xs text-stone-500">Ábrela desde tu pantalla de inicio, como cualquier app.</p>
        </div>
        <button onClick={ocultar} aria-label="Ocultar" className="self-start text-stone-400 hover:text-stone-700">
          ✕
        </button>
      </div>
      <button
        onClick={instalar}
        className="mt-3 h-10 w-full rounded-xl bg-stone-900 text-sm font-medium text-white transition hover:bg-stone-800 active:scale-[0.98]"
      >
        {evento ? "📲 Instalar app" : esIphone ? "📲 ¿Cómo la instalo?" : "📲 Instalar app"}
      </button>
      {pasos && esIphone ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-600">
          <li>Abre esta página en <b>Safari</b>.</li>
          <li>
            Toca el botón <b>Compartir</b> <span aria-hidden>⬆️</span> (abajo en la pantalla).
          </li>
          <li>
            Elige <b>Agregar a inicio</b> y luego <b>Agregar</b>.
          </li>
        </ol>
      ) : null}
    </section>
  );
}
