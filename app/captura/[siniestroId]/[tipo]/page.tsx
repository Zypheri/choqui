import { LinkInvalido } from "@/components/link-invalido";
import {
  CAPTURA_TIPO_CONFIG,
  isFotoTipoMiniApp,
} from "@/lib/captura-tipos";
import {
  contarFotosCompletadas,
  siniestroExiste,
} from "@/lib/siniestro-captura";
import { CapturaFotoForm } from "./captura-foto-form";

interface CapturaPageProps {
  params: { siniestroId: string; tipo: string };
}

export default async function CapturaPage({ params }: CapturaPageProps) {
  const { siniestroId, tipo } = params;

  if (!isFotoTipoMiniApp(tipo)) {
    return <LinkInvalido />;
  }

  const existe = await siniestroExiste(siniestroId);
  if (!existe) {
    return <LinkInvalido />;
  }

  const config = CAPTURA_TIPO_CONFIG[tipo];
  const fotosCompletadas = await contarFotosCompletadas(siniestroId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
      <CapturaFotoForm
        siniestroId={siniestroId}
        tipo={tipo}
        titulo={config.titulo}
        instruccion={config.instruccion}
        fotosCompletadasInicial={fotosCompletadas}
      />
    </main>
  );
}
