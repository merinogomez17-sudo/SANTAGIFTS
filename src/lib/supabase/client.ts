import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes del navegador. Todas las tablas viven en el esquema "santagifts".
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "santagifts" } },
  );
}
