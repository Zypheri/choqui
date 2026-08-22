import { SiniestrosListClient } from "@/components/siniestros-list-client";

export default function NuevosSiniestrosPage() {
  return (
    <SiniestrosListClient
      mode="nuevos"
      title="Nuevos Siniestros"
      description="Siniestros recién ingresados en estado inicio, pendientes de procesamiento."
      emptyMessage="No hay siniestros nuevos por el momento"
    />
  );
}
