import { createClient } from "@/lib/supabase/server";
import {
  FOTO_TIPOS_MINI_APP,
  TOTAL_FOTOS_CHECKLIST,
  type FotoTipoMiniApp,
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

export async function listarTiposFaltantes(
  siniestroId: string
): Promise<FotoTipoMiniApp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fotos")
    .select("tipo")
    .eq("siniestro_id", siniestroId)
    .in("tipo", [...FOTO_TIPOS_MINI_APP]);

  if (error) {
    console.error("Error listando fotos:", error.message);
    return [...FOTO_TIPOS_MINI_APP];
  }

  const tiposHechos = new Set((data ?? []).map((row) => row.tipo));
  return FOTO_TIPOS_MINI_APP.filter((tipo) => !tiposHechos.has(tipo));
}

export async function contarFotosCompletadas(
  siniestroId: string
): Promise<number> {
  const faltantes = await listarTiposFaltantes(siniestroId);
  return TOTAL_FOTOS_CHECKLIST - faltantes.length;
}
