export interface FotoInsert {
  siniestro_id: string;
  tipo: string;
  url: string;
  lat: number;
  lng: number;
  captured_at: string;
  fuente: "mini_app";
}
