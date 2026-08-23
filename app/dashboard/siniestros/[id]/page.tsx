import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { FraudGauge } from "@/components/fraud-gauge";
import { createClient } from "@/lib/supabase/server";
import {
  formatFecha,
  getEstadoBadgeClasses,
  getEstadoLabel,
  getPatenteOtro,
  getShortId,
  summarizeFraudSignals,
} from "@/lib/siniestros";
import type { Siniestro } from "@/types/siniestro";

interface SiniestroDetailPageProps {
  params: { id: string };
}

export default async function SiniestroDetailPage({
  params,
}: SiniestroDetailPageProps) {
  const { id } = params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("siniestros")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const siniestro = data as Siniestro;
  const signalsSummary = summarizeFraudSignals(siniestro.fraud_signals, 4);
  const patenteOtro = getPatenteOtro(siniestro);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/siniestros"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a siniestros
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Siniestro {getShortId(id)}
            </h1>
            <p className="mt-1 font-mono text-sm text-text-muted">{id}</p>
          </div>
          <span
            className={`inline-flex rounded-xl border px-2.5 py-1 text-xs font-medium ${getEstadoBadgeClasses(
              siniestro.estado
            )}`}
          >
            {getEstadoLabel(siniestro.estado)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Fecha
          </p>
          <p className="mt-2 tabular-nums text-text-primary">
            {formatFecha(siniestro.created_at)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Heridos
          </p>
          <p className="mt-2">
            {siniestro.hay_heridos ? (
              <span className="inline-flex items-center gap-1.5 text-critico">
                <AlertTriangle className="h-4 w-4" />
                Sí — atención prioritaria
              </span>
            ) : (
              <span className="text-text-primary">No</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Patente asegurado
          </p>
          <p className="mt-2 font-medium uppercase text-text-primary">
            {siniestro.patente_asegurado ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Patente tercero
          </p>
          <p className="mt-2 font-medium uppercase text-text-primary">
            {patenteOtro ?? "—"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-text-primary">
          Análisis de fraude
        </h2>
        <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center">
          <FraudGauge score={siniestro.fraud_score} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-muted">
              Señales detectadas
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-primary">
              {signalsSummary}
            </p>
            {siniestro.fraud_score === null && (
              <p className="mt-3 text-sm text-text-muted">
                El score todavía no fue calculado para este siniestro.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-text-primary">
          Detalle del parte
        </h2>
        <p className="text-sm text-text-muted">
          Próximamente: edición de datos, fotos y exportación a PDF.
        </p>
      </section>
    </div>
  );
}
