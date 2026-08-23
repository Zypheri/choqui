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

export interface DatosOtroConductor {
  patente?: string;
  patente_otro?: string;
  nombre?: string;
  aseguradora?: string;
  [key: string]: unknown;
}

export interface Siniestro {
  id: string;
  created_at: string;
  estado: SiniestroEstado;
  hay_heridos: boolean | null;
  fraud_score: number | null;
  fraud_signals: FraudSignal[] | string[] | null;
  datos_otro_conductor?: DatosOtroConductor | null;
  patente_asegurado?: string | null;
  resumen?: string | null;
  [key: string]: unknown;
}
