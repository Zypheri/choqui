"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, useMemo, useState } from "react";
import { CapturaFotoStep } from "@/components/captura-foto-step";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { useCapturaFoto } from "@/hooks/use-captura-foto";
import {
  CAPTURA_TIPO_CONFIG,
  TOTAL_CHECKLIST_PASOS,
  TOTAL_FOTOS_CHECKLIST,
  type FotoTipoMiniApp,
} from "@/lib/captura-tipos";

const UbicacionMapa = dynamic(
  () =>
    import("../ubicacion/ubicacion-mapa").then((mod) => mod.UbicacionMapa),
  {
    ssr: false,
    loading: () => (
      <p className="py-10 text-center text-lg text-gray-600">
        Cargando mapa…
      </p>
    ),
  }
);

type WizardStep = "ubicacion" | FotoTipoMiniApp;

interface DocumentacionWizardProps {
  siniestroId: string;
  tieneUbicacionInicial: boolean;
  tiposFaltantesInicial: FotoTipoMiniApp[];
}

interface DocumentacionPasoProps {
  siniestroId: string;
  tipo: FotoTipoMiniApp;
  pasoNumero: number;
  esUltimo: boolean;
  onPasoCompleto: (esUltimo: boolean) => void;
}

function buildPasosRestantes(
  tieneUbicacion: boolean,
  tiposFaltantes: FotoTipoMiniApp[]
): WizardStep[] {
  const pasos: WizardStep[] = [];
  if (!tieneUbicacion) pasos.push("ubicacion");
  pasos.push(...tiposFaltantes);
  return pasos;
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
      progressLabel={`Paso ${pasoNumero} de ${TOTAL_CHECKLIST_PASOS}`}
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
  tieneUbicacionInicial,
  tiposFaltantesInicial,
}: DocumentacionWizardProps) {
  const pasosRestantes = useMemo(
    () => buildPasosRestantes(tieneUbicacionInicial, tiposFaltantesInicial),
    [tieneUbicacionInicial, tiposFaltantesInicial]
  );

  const pasosCompletadosInicial =
    (tieneUbicacionInicial ? 1 : 0) +
    (TOTAL_FOTOS_CHECKLIST - tiposFaltantesInicial.length);

  const [indice, setIndice] = useState(0);
  const [phase, setPhase] = useState<"captura" | "transicion" | "completo">(
    "captura"
  );

  const pasoActual = pasosRestantes[indice];
  const pasoNumero = pasosCompletadosInicial + indice + 1;
  const esUltimo = indice >= pasosRestantes.length - 1;

  async function notifyChecklistCompleto() {
    try {
      await fetch("/api/trigger-paso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siniestro_id: siniestroId,
          paso: "checklist_completo",
        }),
      });
    } catch (error) {
      console.error("No se pudo notificar el paso completado:", error);
    }
  }

  function avanzarPaso(ultimo: boolean) {
    if (ultimo) {
      void notifyChecklistCompleto().then(() => setPhase("completo"));
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

  if (phase === "transicion") {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-semibold text-emerald-800">
          ¡Listo! Siguiente…
        </p>
      </div>
    );
  }

  if (!pasoActual) {
    return <ConfirmacionPaso />;
  }

  if (pasoActual === "ubicacion") {
    return (
      <div className="space-y-6">
        <p className="text-center text-base font-medium text-emerald-800">
          Paso {pasoNumero} de {TOTAL_CHECKLIST_PASOS}
        </p>
        <UbicacionMapa
          siniestroId={siniestroId}
          onSuccess={() => avanzarPaso(esUltimo)}
        />
      </div>
    );
  }

  return (
    <DocumentacionPaso
      key={pasoActual}
      siniestroId={siniestroId}
      tipo={pasoActual}
      pasoNumero={pasoNumero}
      esUltimo={esUltimo}
      onPasoCompleto={avanzarPaso}
    />
  );
}
