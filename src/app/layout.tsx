import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://santagifts.vercel.app"),
  title: "SANTAGIFTS",
  description: "Intercambio de regalos para tu familia y amigos",
  applicationName: "SANTAGIFTS",
  icons: {
    icon: [{ url: "/iconos/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/iconos/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iPhone: al agregarla a inicio se abre sin barra del navegador
  appleWebApp: { capable: true, title: "SantaGifts", statusBarStyle: "default" },
  openGraph: {
    title: "SANTAGIFTS",
    description: "Intercambio de regalos para tu familia y amigos",
    images: [{ url: "/iconos/icono-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
