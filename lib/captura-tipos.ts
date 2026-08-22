export const FOTO_TIPOS = [
  "dni_asegurado",
  "cedula_verde_asegurado",
  "licencia_asegurado",
  "dni_tercero",
  "cedula_verde_tercero",
  "licencia_tercero",
  "vista_frontal",
  "vista_lateral_izq",
  "vista_lateral_der",
  "vista_trasera",
  "danios",
  // legacy
  "patente_otro",
  "danio_propio",
  "carnet",
  "seguro_otro",
] as const;

export type FotoTipo = (typeof FOTO_TIPOS)[number];

export const FOTO_TIPO_LABELS: Record<FotoTipo, string> = {
  dni_asegurado: "DNI del asegurado",
  cedula_verde_asegurado: "Cédula verde del asegurado",
  licencia_asegurado: "Licencia de conducir del asegurado",
  dni_tercero: "DNI del tercero",
  cedula_verde_tercero: "Cédula verde del tercero",
  licencia_tercero: "Licencia de conducir del tercero",
  vista_frontal: "Vista frontal del vehículo",
  vista_lateral_izq: "Vista lateral izquierda",
  vista_lateral_der: "Vista lateral derecha",
  vista_trasera: "Vista trasera del vehículo",
  danios: "Foto de los daños",
  patente_otro: "Patente del otro vehículo",
  danio_propio: "Daño propio",
  carnet: "Carnet",
  seguro_otro: "Seguro del otro",
};

export function isFotoTipo(value: string): value is FotoTipo {
  return (FOTO_TIPOS as readonly string[]).includes(value);
}
