import { notFound } from "next/navigation";
import { CapturaFotoForm } from "./captura-foto-form";
import { FOTO_TIPO_LABELS, isFotoTipo } from "@/lib/captura-tipos";

interface CapturaPageProps {
  params: { siniestroId: string; tipo: string };
}

export default function CapturaPage({ params }: CapturaPageProps) {
  const { siniestroId, tipo } = params;

  if (!isFotoTipo(tipo)) {
    notFound();
  }

  const label = FOTO_TIPO_LABELS[tipo];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">{label}</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sacá la foto con la cámara. Se guardan ubicación y hora de captura
          para verificarla.
        </p>
        <CapturaFotoForm siniestroId={siniestroId} tipo={tipo} />
      </div>
    </main>
  );
}
