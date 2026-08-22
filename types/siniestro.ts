export type SiniestroEstado =
  | "inicio"
  | "en_proceso"
  | "completo"
  | "cerrado"
  | string;

export interface FraudSignal {
  codigo?: string;
  mensaje?: string;
  severidad?: string;
  [key: string]: unknown;
}

export interface Siniestro {
  id: string;
  created_at: string;
  estado: SiniestroEstado;
  hay_heridos: boolean | null;
  fraud_score: number | null;
  fraud_signals: FraudSignal[] | string[] | null;
  organizacion_id?: string | null;
  resumen?: string | null;
  [key: string]: unknown;
}
