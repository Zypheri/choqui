"use client";

import { useState } from "react";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { UbicacionMapa } from "./ubicacion-mapa";

interface UbicacionStandaloneProps {
  siniestroId: string;
}

/** Fallback manual: confirma ubicación y muestra pantalla de éxito. */
export function UbicacionStandalone({ siniestroId }: UbicacionStandaloneProps) {
  const [done, setDone] = useState(false);

  if (done) {
    return <ConfirmacionPaso />;
  }

  return (
    <UbicacionMapa siniestroId={siniestroId} onSuccess={() => setDone(true)} />
  );
}
