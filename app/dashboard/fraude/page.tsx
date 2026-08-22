import { SiniestrosListClient } from "@/components/siniestros-list-client";

export default function FraudePage() {
  return (
    <SiniestrosListClient
      mode="fraude"
      title="Diagnósticos de Fraude"
      description="Siniestros con score de fraude calculado, ordenados de mayor a menor riesgo."
      emptyMessage="Todavía no hay diagnósticos de fraude disponibles."
    />
  );
}
