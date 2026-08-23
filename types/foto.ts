export interface FotoInsert {
  siniestro_id: string;
  tipo: string;
  /** Path en bucket `siniestros-fotos`. */
  storage_path: string;
  hash: string;
  lat: number;
  lng: number;
  captured_at: string;
  fuente: "mini_app";
}
