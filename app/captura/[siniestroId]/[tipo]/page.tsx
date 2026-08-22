import { CapturaFotoForm } from "./captura-foto-form";

interface CapturaPageProps {
  params: { siniestroId: string; tipo: string };
}

export default function CapturaPage({ params }: CapturaPageProps) {
  const { siniestroId, tipo } = params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Captura de foto
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Sacá una foto con la cámara de tu celular. Se registrará tu ubicación
          al momento de la captura.
        </p>
        <CapturaFotoForm siniestroId={siniestroId} tipo={tipo} />
      </div>
    </main>
  );
}
