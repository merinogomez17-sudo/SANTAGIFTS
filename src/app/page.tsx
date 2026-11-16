"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const pasos = [
  { emoji: "📝", titulo: "Crea el intercambio", texto: "Fecha, lugar y presupuesto." },
  { emoji: "👨‍👩‍👧‍👦", titulo: "Invita a todos", texto: "Por WhatsApp o búscalos por correo." },
  { emoji: "🎲", titulo: "Haz el sorteo", texto: "Nadie sabe quién le tocó a quién." },
  { emoji: "🤫", titulo: "Pregunta en secreto", texto: "Tallas, gustos y emojis, sin revelarte." },
];

export default function Inicio() {
  const router = useRouter();

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) router.replace("/eventos");
      });
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm font-bold tracking-[0.18em]">
          SANTA<span className="text-acento">GIFTS</span>
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance">
          El intercambio de regalos de tu familia, sin papelitos.
        </h1>
        <p className="text-stone-500">Amigo secreto para la familia, los amigos o la oficina. Gratis.</p>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {pasos.map((p) => (
          <li key={p.titulo} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="text-2xl">{p.emoji}</div>
            <p className="mt-2 text-sm font-semibold">{p.titulo}</p>
            <p className="mt-0.5 text-xs text-stone-500">{p.texto}</p>
          </li>
        ))}
      </ul>

      <Link
        href="/entrar"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-stone-900 text-sm font-medium text-white transition hover:bg-stone-800"
      >
        Empezar
      </Link>
    </main>
  );
}
