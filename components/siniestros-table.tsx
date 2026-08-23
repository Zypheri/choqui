"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { FraudGauge } from "@/components/fraud-gauge";
import {
  formatFecha,
  getEstadoBadgeClasses,
  getEstadoLabel,
  getShortId,
  summarizeFraudSignals,
} from "@/lib/siniestros";
import type { Siniestro } from "@/types/siniestro";

interface SiniestrosTableProps {
  siniestros: Siniestro[];
  gaugeSize?: "sm" | "md";
  showSignals?: boolean;
  emptyMessage?: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showToolbar?: boolean;
}

export function SiniestrosTable({
  siniestros,
  gaugeSize = "sm",
  showSignals = false,
  emptyMessage = "No hay siniestros para mostrar",
  searchQuery = "",
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  showToolbar = true,
}: SiniestrosTableProps) {
  const tableContent =
    siniestros.length === 0 ? (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-text-muted">{emptyMessage}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-base/50 text-xs uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">ID</th>
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
                className="border-b border-border transition-colors last:border-b-0 hover:bg-bg-base/60"
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
                  <Link
                    href={`/dashboard/siniestros/${siniestro.id}`}
                    className="font-mono text-xs tabular-nums text-text-muted hover:text-accent"
                  >
                    {getShortId(siniestro.id)}
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
                    <FraudGauge
                      score={siniestro.fraud_score}
                      size={gaugeSize}
                    />
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-surface shadow-sm">
      {showToolbar && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar por patente o ID…"
              className="w-full rounded-xl border border-border bg-bg-base py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-base disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>
        </div>
      )}
      {tableContent}
    </div>
  );
}
