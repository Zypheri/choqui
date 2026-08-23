import type { FraudSignal, Siniestro, SiniestroEstado } from "@/types/siniestro";

const ESTADOS_CERRADOS = new Set([
  "completo",
  "aprobado",
  "rechazado",
  "abandonado",
]);

export function formatFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getShortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function getPatenteOtro(siniestro: Siniestro): string | null {
  const datos = siniestro.datos_otro_conductor;
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;

  const record = datos as Record<string, unknown>;
  const patente =
    record.patente ?? record.patente_otro ?? record.patenteOtro ?? null;

  return typeof patente === "string" && patente.trim() ? patente.trim() : null;
}

export function filterSiniestrosBySearch(
  siniestros: Siniestro[],
  query: string
): Siniestro[] {
  const term = query.trim().toLowerCase();
  if (!term) return siniestros;

  return siniestros.filter((siniestro) => {
    const patente = getPatenteOtro(siniestro)?.toLowerCase() ?? "";
    const shortId = getShortId(siniestro.id).toLowerCase();
    const fullId = siniestro.id.toLowerCase();

    return (
      patente.includes(term) ||
      shortId.includes(term) ||
      fullId.includes(term)
    );
  });
}

export function getEstadoLabel(estado: SiniestroEstado): string {
  const labels: Record<string, string> = {
    inicio: "Inicio",
    hay_heridos_check: "Verificando heridos",
    pidiendo_patente: "Patente",
    pidiendo_relato: "Relato",
    pidiendo_ubicacion_mapa: "Ubicación",
    pidiendo_documentacion: "Documentación",
    pidiendo_foto_patente_otro: "Foto patente",
    pidiendo_foto_danio_propio: "Foto daños",
    pidiendo_datos_otro_conductor: "Datos tercero",
    pidiendo_foto_carnet_seguro: "Carnet/seguro",
    pidiendo_ubicacion: "Ubicación",
    generando_resumen: "Generando resumen",
    esperando_decision_pendiente: "Decisión pendiente",
    en_proceso: "En proceso",
    completo: "Completo",
    en_revision: "En revisión",
    sin_inconsistencias: "Sin inconsistencias",
    posible_fraude: "Posible fraude",
    requiere_info: "Requiere info",
    abandonado: "Abandonado",
    cerrado: "Cerrado",
  };
  return labels[estado] ?? estado;
}

export function getEstadoBadgeClasses(estado: SiniestroEstado): string {
  switch (estado) {
    case "inicio":
    case "hay_heridos_check":
      return "bg-accent/10 text-accent border-accent/20";
    case "completo":
    case "sin_inconsistencias":
      return "bg-fraud-bajo/10 text-fraud-bajo border-fraud-bajo/20";
    case "posible_fraude":
      return "bg-fraud-alto/10 text-fraud-alto border-fraud-alto/20";
    case "abandonado":
    case "requiere_info":
      return "bg-bg-base text-text-muted border-border";
    default:
      return "bg-bg-base text-text-primary border-border";
  }
}

export function isHeridoActivo(siniestro: Siniestro): boolean {
  return (
    siniestro.hay_heridos === true &&
    !ESTADOS_CERRADOS.has(String(siniestro.estado))
  );
}

export function summarizeFraudSignals(
  signals: FraudSignal[] | string[] | null | undefined,
  max = 2
): string {
  if (!signals || signals.length === 0) return "Sin señales registradas";

  const texts = signals
    .map((signal) => {
      if (typeof signal === "string") return signal;
      return (
        signal.mensaje ||
        signal.codigo ||
        (typeof signal.severidad === "string" ? signal.severidad : null)
      );
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, max);

  if (texts.length === 0) return "Sin señales registradas";

  const joined = texts.join(" · ");
  return joined.length > 80 ? `${joined.slice(0, 77)}…` : joined;
}
