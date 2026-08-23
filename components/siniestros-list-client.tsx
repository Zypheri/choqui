"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SiniestrosKpiCards } from "@/components/siniestros-kpi-cards";
import { SiniestrosTable } from "@/components/siniestros-table";
import { filterSiniestrosBySearch } from "@/lib/siniestros";
import { createClient } from "@/lib/supabase/client";
import type { Siniestro } from "@/types/siniestro";

type ListMode = "all" | "nuevos" | "fraude";

interface SiniestrosListClientProps {
  mode: ListMode;
  title: string;
  description: string;
  emptyMessage: string;
}

export function SiniestrosListClient({
  mode,
  title,
  description,
  emptyMessage,
}: SiniestrosListClientProps) {
  const [siniestros, setSiniestros] = useState<Siniestro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSiniestros = useCallback(
    async (options?: { silent?: boolean; manual?: boolean }) => {
      if (options?.manual) {
        setIsRefreshing(true);
      }

      const supabase = createClient();
      let query = supabase.from("siniestros").select("*");

      if (mode === "nuevos") {
        query = query.eq("estado", "inicio").order("created_at", {
          ascending: false,
        });
      } else if (mode === "fraude") {
        query = query
          .not("fraud_score", "is", null)
          .order("fraud_score", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setSiniestros([]);
      } else {
        setError(null);
        setSiniestros((data as Siniestro[]) ?? []);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [mode]
  );

  useEffect(() => {
    fetchSiniestros();

    const supabase = createClient();
    const channel = supabase
      .channel(`siniestros-list-${mode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "siniestros" },
        () => {
          fetchSiniestros({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSiniestros, mode]);

  const filteredSiniestros = useMemo(
    () => filterSiniestrosBySearch(siniestros, searchQuery),
    [siniestros, searchQuery]
  );

  const displayEmptyMessage =
    siniestros.length === 0
      ? emptyMessage
      : searchQuery.trim()
        ? "No se encontraron resultados para tu búsqueda"
        : emptyMessage;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      {mode === "all" && <SiniestrosKpiCards />}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-bg-surface px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-text-muted">Cargando siniestros…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-critico/20 bg-critico/5 px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-critico">{error}</p>
        </div>
      ) : (
        <SiniestrosTable
          siniestros={filteredSiniestros}
          gaugeSize={mode === "fraude" ? "md" : "sm"}
          showSignals={mode === "fraude"}
          emptyMessage={displayEmptyMessage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => fetchSiniestros({ manual: true })}
          isRefreshing={isRefreshing}
        />
      )}
    </div>
  );
}
