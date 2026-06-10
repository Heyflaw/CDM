import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Exclut les assets statiques et la route de synchro (protégée par son
  // propre secret, appelée par le cron sans session).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
