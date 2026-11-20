-- ==============================================================
-- HU005: Gestionar costos de personal (MACH TI)
-- Creado para la gestión de costos por hora y su histórico
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.costos_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  costo_hora NUMERIC(10, 2) NOT NULL CHECK (costo_hora > 0),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  vigente BOOLEAN NOT NULL DEFAULT true,
  registrado_por UUID NULL REFERENCES public.usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para optimizar consultas de costos vigentes e histórico
CREATE INDEX IF NOT EXISTS idx_costos_colaborador_vigente 
  ON public.costos_colaboradores(colaborador_id, vigente);

CREATE INDEX IF NOT EXISTS idx_costos_fecha_inicio 
  ON public.costos_colaboradores(fecha_inicio DESC);

-- Comentario explicativo en la tabla
COMMENT ON TABLE public.costos_colaboradores IS 
  'Historial y costos internos vigentes de colaboradores para cálculo de costos de servicios';
