import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { LinkInvalido } from "@/components/link-invalido";
import {
  listarTiposFaltantes,
  siniestroExiste,
  tieneUbicacionReportada,
} from "@/lib/siniestro-captura";
import { DocumentacionWizard } from "./documentacion-wizard";

interface DocumentacionPageProps {
  params: { siniestroId: string };
}

export default async function DocumentacionPage({
  params,
}: DocumentacionPageProps) {
  const { siniestroId } = params;

  const existe = await siniestroExiste(siniestroId);
  if (!existe) {
    return <LinkInvalido />;
  }

  const [tieneUbicacion, tiposFaltantes] = await Promise.all([
    tieneUbicacionReportada(siniestroId),
    listarTiposFaltantes(siniestroId),
  ]);

  const checklistCompleto =
    tieneUbicacion && tiposFaltantes.length === 0;

  if (checklistCompleto) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <ConfirmacionPaso />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
      <DocumentacionWizard
        siniestroId={siniestroId}
        tieneUbicacionInicial={tieneUbicacion}
        tiposFaltantesInicial={tiposFaltantes}
      />
    </main>
  );
}
