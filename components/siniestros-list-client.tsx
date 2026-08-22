"use client";

import { useCallback, useEffect, useState } from "react";
import { SiniestrosTable } from "@/components/siniestros-table";
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
  const [error, setError] = useState<string | null>(null);

  const fetchSiniestros = useCallback(async () => {
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
  }, [mode]);

  useEffect(() => {
    fetchSiniestros();

    const supabase = createClient();
    const channel = supabase
      .channel(`siniestros-list-${mode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "siniestros" },
        () => {
          fetchSiniestros();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSiniestros, mode]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-bg-surface px-6 py-16 text-center">
          <p className="text-sm text-text-muted">Cargando siniestros…</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-critico/30 bg-critico/10 px-6 py-8 text-center">
          <p className="text-sm text-critico">{error}</p>
        </div>
      ) : (
        <SiniestrosTable
          siniestros={siniestros}
          gaugeSize={mode === "fraude" ? "md" : "sm"}
          showSignals={mode === "fraude"}
          emptyMessage={emptyMessage}
        />
      )}
    </div>
  );
}
