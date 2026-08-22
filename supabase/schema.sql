-- Choqui — schema single-tenant (demo "Aseguradora Demo")
-- No hay tabla organizaciones: un solo cliente implícito.
-- Autorización: existe fila en operadores con id = auth.uid().

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE public.operadores (
  id uuid PRIMARY KEY REFERENCES auth.users (id),
  nombre text,
  rol text DEFAULT 'operador'::text CHECK (rol = ANY (ARRAY['operador'::text, 'admin'::text])),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  telefono text NOT NULL UNIQUE,
  nombre text,
  domicilio_lat double precision,
  domicilio_lng double precision,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.polizas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  patente text NOT NULL UNIQUE,
  numero_poliza text,
  usuario_id uuid REFERENCES public.usuarios (id),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.siniestros (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id),
  estado text NOT NULL DEFAULT 'inicio'::text CHECK (
    estado = ANY (
      ARRAY[
        'inicio'::text,
        'hay_heridos_check'::text,
        'pidiendo_patente'::text,
        'pidiendo_foto_patente_otro'::text,
        'pidiendo_foto_danio_propio'::text,
        'pidiendo_datos_otro_conductor'::text,
        'pidiendo_foto_carnet_seguro'::text,
        'pidiendo_ubicacion'::text,
        'generando_resumen'::text,
        'esperando_decision_pendiente'::text,
        'completo'::text,
        'en_revision'::text,
        'sin_inconsistencias'::text,
        'posible_fraude'::text,
        'requiere_info'::text,
        'abandonado'::text
      ]
    )
  ),
  hay_heridos boolean,
  datos_otro_conductor jsonb,
  ubicacion_reportada_lat double precision,
  ubicacion_reportada_lng double precision,
  ubicacion_reportada_at timestamptz,
  resumen_ia text,
  resumen_editado text,
  parte_pdf_url text,
  fraud_score integer CHECK (fraud_score >= 0 AND fraud_score <= 100),
  fraud_signals jsonb,
  fraud_revisado boolean DEFAULT false,
  operador_asignado_id uuid REFERENCES public.operadores (id),
  patente_asegurado text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.fotos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  siniestro_id uuid NOT NULL REFERENCES public.siniestros (id),
  tipo text NOT NULL CHECK (
    tipo = ANY (ARRAY['patente_otro'::text, 'danio_propio'::text, 'carnet'::text, 'seguro_otro'::text])
  ),
  url text NOT NULL,
  fuente text NOT NULL DEFAULT 'whatsapp'::text CHECK (
    fuente = ANY (ARRAY['whatsapp'::text, 'mini_app'::text])
  ),
  lat double precision,
  lng double precision,
  captured_at timestamptz,
  validada boolean DEFAULT false,
  datos_extraidos jsonb,
  motivo_invalida text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.mensajes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  siniestro_id uuid REFERENCES public.siniestros (id),
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id),
  direccion text NOT NULL CHECK (direccion = ANY (ARRAY['entrante'::text, 'saliente'::text])),
  contenido text,
  tipo text DEFAULT 'texto'::text CHECK (
    tipo = ANY (ARRAY['texto'::text, 'imagen'::text, 'ubicacion'::text])
  ),
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_usuarios_telefono ON public.usuarios USING btree (telefono);
CREATE INDEX idx_polizas_patente ON public.polizas USING btree (patente);
CREATE INDEX idx_siniestros_estado ON public.siniestros USING btree (estado);
CREATE INDEX idx_siniestros_usuario ON public.siniestros USING btree (usuario_id);
CREATE INDEX idx_siniestros_usuario_pendiente ON public.siniestros (usuario_id, updated_at DESC)
  WHERE estado = ANY (
    ARRAY[
      'inicio'::text,
      'hay_heridos_check'::text,
      'pidiendo_patente'::text,
      'pidiendo_foto_patente_otro'::text,
      'pidiendo_foto_danio_propio'::text,
      'pidiendo_datos_otro_conductor'::text,
      'pidiendo_foto_carnet_seguro'::text,
      'pidiendo_ubicacion'::text,
      'generando_resumen'::text,
      'esperando_decision_pendiente'::text
    ]
  );
CREATE INDEX idx_fotos_siniestro ON public.fotos USING btree (siniestro_id);
CREATE INDEX idx_mensajes_siniestro ON public.mensajes USING btree (siniestro_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siniestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operador ve su propio perfil"
  ON public.operadores
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "operadores ven siniestros"
  ON public.siniestros
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid()));

CREATE POLICY "operadores actualizan siniestros"
  ON public.siniestros
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid()));

CREATE POLICY "operadores ven fotos"
  ON public.fotos
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.siniestros WHERE id = fotos.siniestro_id)
  );

CREATE POLICY "operadores ven mensajes"
  ON public.mensajes
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid())
    AND (
      mensajes.siniestro_id IS NULL
      OR EXISTS (SELECT 1 FROM public.siniestros WHERE id = mensajes.siniestro_id)
    )
  );

CREATE POLICY "operadores ven usuarios"
  ON public.usuarios
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid()));

CREATE POLICY "operadores ven polizas"
  ON public.polizas
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.operadores WHERE id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.siniestros;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fotos;
