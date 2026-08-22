"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { FraudGauge } from "@/components/fraud-gauge";
import {
  formatFecha,
  getEstadoBadgeClasses,
  getEstadoLabel,
  summarizeFraudSignals,
} from "@/lib/siniestros";
import type { Siniestro } from "@/types/siniestro";

interface SiniestrosTableProps {
  siniestros: Siniestro[];
  gaugeSize?: "sm" | "md";
  showSignals?: boolean;
  emptyMessage?: string;
}

export function SiniestrosTable({
  siniestros,
  gaugeSize = "sm",
  showSignals = false,
  emptyMessage = "No hay siniestros para mostrar",
}: SiniestrosTableProps) {
  if (siniestros.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface px-6 py-16 text-center">
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-bg-surface">
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Heridos</th>
            <th className="px-4 py-3 font-medium">Fraude</th>
            {showSignals && (
              <th className="px-4 py-3 font-medium">Señales</th>
            )}
          </tr>
        </thead>
        <tbody>
          {siniestros.map((siniestro) => (
            <tr
              key={siniestro.id}
              className="border-b border-border bg-bg-surface transition-colors last:border-b-0 hover:bg-bg-surface-hover"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/siniestros/${siniestro.id}`}
                  className="block tabular-nums text-text-primary hover:text-accent"
                >
                  {formatFecha(siniestro.created_at)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link href={`/dashboard/siniestros/${siniestro.id}`}>
                  <span
                    className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${getEstadoBadgeClasses(
                      siniestro.estado
                    )}`}
                  >
                    {getEstadoLabel(siniestro.estado)}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link href={`/dashboard/siniestros/${siniestro.id}`}>
                  {siniestro.hay_heridos ? (
                    <span className="inline-flex items-center gap-1.5 text-critico">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-text-muted">No</span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/siniestros/${siniestro.id}`}
                  className="inline-flex"
                >
                  <FraudGauge score={siniestro.fraud_score} size={gaugeSize} />
                </Link>
              </td>
              {showSignals && (
                <td className="max-w-xs px-4 py-3">
                  <Link
                    href={`/dashboard/siniestros/${siniestro.id}`}
                    className="line-clamp-2 text-text-muted hover:text-text-primary"
                  >
                    {summarizeFraudSignals(siniestro.fraud_signals)}
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
