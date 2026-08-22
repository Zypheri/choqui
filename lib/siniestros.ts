import type { FraudSignal, SiniestroEstado } from "@/types/siniestro";

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

export function getEstadoLabel(estado: SiniestroEstado): string {
  const labels: Record<string, string> = {
    inicio: "Inicio",
    en_proceso: "En proceso",
    completo: "Completo",
    cerrado: "Cerrado",
  };
  return labels[estado] ?? estado;
}

export function getEstadoBadgeClasses(estado: SiniestroEstado): string {
  switch (estado) {
    case "inicio":
      return "bg-accent/15 text-accent border-accent/30";
    case "en_proceso":
      return "bg-text-muted/10 text-text-primary border-border";
    case "completo":
      return "bg-text-primary/10 text-text-primary border-border";
    case "cerrado":
      return "bg-bg-base text-text-muted border-border";
    default:
      return "bg-bg-base text-text-muted border-border";
  }
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
