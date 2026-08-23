import { createClient } from "@/lib/supabase/server";
import {
  FOTO_TIPOS_MINI_APP,
  TOTAL_FOTOS_CHECKLIST,
} from "@/lib/captura-tipos";

export async function siniestroExiste(siniestroId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("siniestros")
    .select("id")
    .eq("id", siniestroId)
    .maybeSingle();

  if (error) {
    console.error("Error validando siniestro:", error.message);
    return false;
  }

  return Boolean(data?.id);
}

export async function contarFotosCompletadas(
  siniestroId: string
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fotos")
    .select("tipo")
    .eq("siniestro_id", siniestroId)
    .in("tipo", [...FOTO_TIPOS_MINI_APP]);

  if (error) {
    console.error("Error contando fotos:", error.message);
    return 0;
  }

  const tiposUnicos = new Set((data ?? []).map((row) => row.tipo));
  return Math.min(tiposUnicos.size, TOTAL_FOTOS_CHECKLIST);
}
