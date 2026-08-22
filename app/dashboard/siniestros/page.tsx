import { SiniestrosListClient } from "@/components/siniestros-list-client";

export default function SiniestrosPage() {
  return (
    <SiniestrosListClient
      mode="all"
      title="Siniestros"
      description="Todos los siniestros registrados, actualizados en tiempo real."
      emptyMessage="Todavía no hay siniestros registrados."
    />
  );
}
