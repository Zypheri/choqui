"use client";

import { ChangeEvent, useState } from "react";
import { CapturaFotoStep } from "@/components/captura-foto-step";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { useCapturaFoto } from "@/hooks/use-captura-foto";
import {
  CAPTURA_TIPO_CONFIG,
  TOTAL_FOTOS_CHECKLIST,
  type FotoTipoMiniApp,
} from "@/lib/captura-tipos";

interface DocumentacionWizardProps {
  siniestroId: string;
  tiposFaltantesInicial: FotoTipoMiniApp[];
}

interface DocumentacionPasoProps {
  siniestroId: string;
  tipo: FotoTipoMiniApp;
  pasoNumero: number;
  esUltimo: boolean;
  onPasoCompleto: (esUltimo: boolean) => void;
}

function DocumentacionPaso({
  siniestroId,
  tipo,
  pasoNumero,
  esUltimo,
  onPasoCompleto,
}: DocumentacionPasoProps) {
  const config = CAPTURA_TIPO_CONFIG[tipo];
  const { status, errorMessage, subirFoto, retryGeo, cancelGeo } =
    useCapturaFoto(siniestroId, tipo);

  async function finishIfOk(ok: boolean) {
    if (ok) onPasoCompleto(esUltimo);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const ok = await subirFoto(file);
    await finishIfOk(ok);
  }

  async function handleRetryGeo() {
    const ok = await retryGeo();
    await finishIfOk(ok);
  }

  return (
    <CapturaFotoStep
      titulo={config.titulo}
      instruccion={config.instruccion}
      progressLabel={`Paso ${pasoNumero} de ${TOTAL_FOTOS_CHECKLIST}`}
      status={status}
      errorMessage={errorMessage}
      onFileChange={handleFileChange}
      onRetryGeo={handleRetryGeo}
      onCancelGeo={cancelGeo}
    />
  );
}

export function DocumentacionWizard({
  siniestroId,
  tiposFaltantesInicial,
}: DocumentacionWizardProps) {
  const [faltantes] = useState(tiposFaltantesInicial);
  const [indice, setIndice] = useState(0);
  const [phase, setPhase] = useState<"captura" | "transicion" | "completo">(
    "captura"
  );

  const completadosInicial = TOTAL_FOTOS_CHECKLIST - faltantes.length;
  const tipoActual = faltantes[indice];
  const pasoNumero = completadosInicial + indice + 1;
  const esUltimo = indice >= faltantes.length - 1;

  async function notifyDocumentacionCompleta() {
    try {
      await fetch("/api/trigger-paso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siniestro_id: siniestroId,
          paso: "documentacion_completa",
        }),
      });
    } catch (error) {
      console.error("No se pudo notificar el paso completado:", error);
    }
  }

  async function handlePasoCompleto(ultimo: boolean) {
    if (ultimo) {
      await notifyDocumentacionCompleta();
      setPhase("completo");
      return;
    }

    setPhase("transicion");
    window.setTimeout(() => {
      setIndice((prev) => prev + 1);
      setPhase("captura");
    }, 500);
  }

  if (phase === "completo") {
    return <ConfirmacionPaso />;
  }

  if (phase === "transicion" || !tipoActual) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-semibold text-emerald-800">
          ¡Listo! Siguiente…
        </p>
      </div>
    );
  }

  return (
    <DocumentacionPaso
      key={tipoActual}
      siniestroId={siniestroId}
      tipo={tipoActual}
      pasoNumero={pasoNumero}
      esUltimo={esUltimo}
      onPasoCompleto={handlePasoCompleto}
    />
  );
}
