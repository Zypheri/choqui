export interface FotoInsert {
  siniestro_id: string;
  tipo: string;
  lat: number;
  lng: number;
  captured_at: string;
  fuente: "mini_app";
  storage_path: string;
}
