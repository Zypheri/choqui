export const FOTO_TIPOS_MINI_APP = [
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
] as const;

export type FotoTipoMiniApp = (typeof FOTO_TIPOS_MINI_APP)[number];

export const TOTAL_FOTOS_CHECKLIST = FOTO_TIPOS_MINI_APP.length;

/** Ubicación + 11 documentos del checklist mini-app. */
export const TOTAL_CHECKLIST_PASOS = TOTAL_FOTOS_CHECKLIST + 1;

interface CapturaTipoConfig {
  titulo: string;
  instruccion: string;
}

const INSTRUCCION_DEFAULT = "Sacá una foto clara y nítida";

export const CAPTURA_TIPO_CONFIG: Record<FotoTipoMiniApp, CapturaTipoConfig> = {
  dni_asegurado: {
    titulo: "Foto de tu DNI",
    instruccion: "Sacá una foto clara del frente de tu DNI",
  },
  cedula_verde_asegurado: {
    titulo: "Cédula verde de tu auto",
    instruccion: "Foto de la cédula verde (o azul) de tu vehículo",
  },
  licencia_asegurado: {
    titulo: "Tu licencia de conducir",
    instruccion: "Foto del frente de tu licencia",
  },
  dni_tercero: {
    titulo: "DNI del otro conductor",
    instruccion: "Si lo tenés a mano, sacale una foto",
  },
  cedula_verde_tercero: {
    titulo: "Cédula verde del otro vehículo",
    instruccion: INSTRUCCION_DEFAULT,
  },
  licencia_tercero: {
    titulo: "Licencia del otro conductor",
    instruccion: INSTRUCCION_DEFAULT,
  },
  vista_frontal: {
    titulo: "Foto frontal de tu auto",
    instruccion: INSTRUCCION_DEFAULT,
  },
  vista_lateral_izq: {
    titulo: "Foto lateral izquierda",
    instruccion: INSTRUCCION_DEFAULT,
  },
  vista_lateral_der: {
    titulo: "Foto lateral derecha",
    instruccion: INSTRUCCION_DEFAULT,
  },
  vista_trasera: {
    titulo: "Foto trasera",
    instruccion: INSTRUCCION_DEFAULT,
  },
  danios: {
    titulo: "Foto de los daños",
    instruccion: "Enfocá bien la zona golpeada",
  },
};

/** Tipos legacy + mini-app (schema / dashboard). */
export const FOTO_TIPOS = [
  ...FOTO_TIPOS_MINI_APP,
  "patente_otro",
  "danio_propio",
  "carnet",
  "seguro_otro",
] as const;

export type FotoTipo = (typeof FOTO_TIPOS)[number];

export const FOTO_TIPO_LABELS: Record<FotoTipo, string> = {
  dni_asegurado: CAPTURA_TIPO_CONFIG.dni_asegurado.titulo,
  cedula_verde_asegurado: CAPTURA_TIPO_CONFIG.cedula_verde_asegurado.titulo,
  licencia_asegurado: CAPTURA_TIPO_CONFIG.licencia_asegurado.titulo,
  dni_tercero: CAPTURA_TIPO_CONFIG.dni_tercero.titulo,
  cedula_verde_tercero: CAPTURA_TIPO_CONFIG.cedula_verde_tercero.titulo,
  licencia_tercero: CAPTURA_TIPO_CONFIG.licencia_tercero.titulo,
  vista_frontal: CAPTURA_TIPO_CONFIG.vista_frontal.titulo,
  vista_lateral_izq: CAPTURA_TIPO_CONFIG.vista_lateral_izq.titulo,
  vista_lateral_der: CAPTURA_TIPO_CONFIG.vista_lateral_der.titulo,
  vista_trasera: CAPTURA_TIPO_CONFIG.vista_trasera.titulo,
  danios: CAPTURA_TIPO_CONFIG.danios.titulo,
  patente_otro: "Patente del otro vehículo",
  danio_propio: "Daño propio",
  carnet: "Carnet",
  seguro_otro: "Seguro del otro",
};

export function isFotoTipoMiniApp(value: string): value is FotoTipoMiniApp {
  return (FOTO_TIPOS_MINI_APP as readonly string[]).includes(value);
}

export function isFotoTipo(value: string): value is FotoTipo {
  return (FOTO_TIPOS as readonly string[]).includes(value);
}
