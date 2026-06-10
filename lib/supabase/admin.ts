import { createClient } from "@supabase/supabase-js";

// Client "service role" : contourne le RLS. À n'utiliser QUE côté serveur
// (route /api/sync). Ne jamais exposer la clé au navigateur.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
