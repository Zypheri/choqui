import { UbicacionMapa } from "./ubicacion-mapa";

interface UbicacionPageProps {
  params: { siniestroId: string };
}

export default function UbicacionPage({ params }: UbicacionPageProps) {
  const { siniestroId } = params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          ¿Dónde ocurrió el accidente?
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Marcá el punto exacto en el mapa. Podés arrastrar el pin o tocar el
          mapa.
        </p>
        <UbicacionMapa siniestroId={siniestroId} />
      </div>
    </main>
  );
}
