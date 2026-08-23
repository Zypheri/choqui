"use client";

import { ChangeEvent, useState } from "react";
import { CapturaFotoStep } from "@/components/captura-foto-step";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { useCapturaFoto } from "@/hooks/use-captura-foto";
import { TOTAL_FOTOS_CHECKLIST } from "@/lib/captura-tipos";

interface CapturaFotoFormProps {
  siniestroId: string;
  tipo: string;
  titulo: string;
  instruccion: string;
  fotosCompletadasInicial: number;
}

export function CapturaFotoForm({
  siniestroId,
  tipo,
  titulo,
  instruccion,
  fotosCompletadasInicial,
}: CapturaFotoFormProps) {
  const { status, errorMessage, subirFoto, retryGeo, cancelGeo } =
    useCapturaFoto(siniestroId, tipo);
  const [completadas, setCompletadas] = useState(fotosCompletadasInicial);
  const [done, setDone] = useState(false);

  async function onSuccess() {
    try {
      await fetch("/api/trigger-paso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siniestro_id: siniestroId,
          paso: tipo,
        }),
      });
    } catch (error) {
      console.error("No se pudo notificar el paso completado:", error);
    }

    setCompletadas((prev) => Math.min(prev + 1, TOTAL_FOTOS_CHECKLIST));
    setDone(true);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const ok = await subirFoto(file);
    if (ok) await onSuccess();
  }

  async function handleRetryGeo() {
    const ok = await retryGeo();
    if (ok) await onSuccess();
  }

  if (done) {
    return <ConfirmacionPaso />;
  }

  return (
    <CapturaFotoStep
      titulo={titulo}
      instruccion={instruccion}
      progressLabel={`Ya completaste ${completadas} de ${TOTAL_FOTOS_CHECKLIST}`}
      status={status}
      errorMessage={errorMessage}
      onFileChange={handleFileChange}
      onRetryGeo={handleRetryGeo}
      onCancelGeo={cancelGeo}
    />
  );
}
