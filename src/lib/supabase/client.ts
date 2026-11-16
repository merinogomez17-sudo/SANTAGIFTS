import { createBrowserClient } from "@supabase/ssr";

let cliente: ReturnType<typeof crear> | undefined;

function crear() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: "santagifts" } },
  );
}

// Cliente para componentes del navegador. Todas las tablas viven en el esquema "santagifts".
export function createClient() {
  if (!cliente) cliente = crear();
  return cliente;
}
