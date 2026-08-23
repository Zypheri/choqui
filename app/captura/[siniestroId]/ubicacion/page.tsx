import dynamic from "next/dynamic";
import { LinkInvalido } from "@/components/link-invalido";
import { siniestroExiste } from "@/lib/siniestro-captura";

const UbicacionStandalone = dynamic(
  () =>
    import("./ubicacion-standalone").then((mod) => mod.UbicacionStandalone),
  {
    ssr: false,
    loading: () => (
      <p className="py-10 text-center text-lg text-gray-600">
        Cargando mapa…
      </p>
    ),
  }
);

interface UbicacionPageProps {
  params: { siniestroId: string };
}

export default async function UbicacionPage({ params }: UbicacionPageProps) {
  const { siniestroId } = params;

  const existe = await siniestroExiste(siniestroId);
  if (!existe) {
    return <LinkInvalido />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
      <UbicacionStandalone siniestroId={siniestroId} />
    </main>
  );
}
