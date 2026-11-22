import type { MetadataRoute } from "next";

// Permite instalar SANTAGIFTS en el celular como app (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SANTAGIFTS",
    short_name: "SantaGifts",
    description: "Intercambio de regalos para tu familia y amigos",
    lang: "es-MX",
    start_url: "/eventos",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#fafaf9",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
