"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  FolderOpen,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface KpiData {
  total: number;
  nuevosHoy: number;
  heridosActivos: number;
  altoRiesgo: number;
}

const ESTADOS_CERRADOS = ["completo", "aprobado", "rechazado", "abandonado"];

function getStartOfTodayIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export function SiniestrosKpiCards() {
  const [kpis, setKpis] = useState<KpiData>({
    total: 0,
    nuevosHoy: 0,
    heridosActivos: 0,
    altoRiesgo: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchKpis = useCallback(async () => {
    const supabase = createClient();
    const startOfToday = getStartOfTodayIso();

    const [totalRes, nuevosHoyRes, heridosRes, altoRiesgoRes] =
      await Promise.all([
        supabase
          .from("siniestros")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("siniestros")
          .select("*", { count: "exact", head: true })
          .gte("created_at", startOfToday),
        supabase
          .from("siniestros")
          .select("*", { count: "exact", head: true })
          .eq("hay_heridos", true)
          .not("estado", "in", `(${ESTADOS_CERRADOS.join(",")})`),
        supabase
          .from("siniestros")
          .select("*", { count: "exact", head: true })
          .gt("fraud_score", 60),
      ]);

    setKpis({
      total: totalRes.count ?? 0,
      nuevosHoy: nuevosHoyRes.count ?? 0,
      heridosActivos: heridosRes.count ?? 0,
      altoRiesgo: altoRiesgoRes.count ?? 0,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchKpis();

    const supabase = createClient();
    const channel = supabase
      .channel("siniestros-kpis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "siniestros" },
        () => {
          fetchKpis();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKpis]);

  const cards = [
    {
      label: "Siniestros totales",
      value: kpis.total,
      icon: FolderOpen,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      label: "Nuevos hoy",
      value: kpis.nuevosHoy,
      icon: CalendarPlus,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      label: "Heridos activos",
      value: kpis.heridosActivos,
      icon: AlertTriangle,
      iconBg: "bg-critico/10",
      iconColor: "text-critico",
    },
    {
      label: "Casos de alto riesgo",
      value: kpis.altoRiesgo,
      icon: ShieldAlert,
      iconBg: "bg-fraud-alto/10",
      iconColor: "text-fraud-alto",
    },
  ] as const;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="relative rounded-xl border border-border bg-bg-surface p-5 shadow-sm"
          >
            <div
              className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full ${card.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-text-primary">
              {isLoading ? "—" : card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
