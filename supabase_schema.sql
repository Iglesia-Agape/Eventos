-- =======================================================================
-- EVENTSYNC - ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL & REALTIME)
-- =======================================================================
-- Instrucciones:
-- 1. Inicia sesión en tu proyecto de Supabase (https://supabase.com).
-- 2. Ve a la sección "SQL Editor" en el menú lateral.
-- 3. Crea una "New query", pega todo este contenido y haz clic en "Run".
-- 4. Copia tu "Project URL" y tu "anon public key" desde Project Settings > API
--    y colócalos en la sección de Configuración de la app web EventSync.
-- =======================================================================

-- Habilitar extensión para UUIDs (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: EVENTOS
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  capacity INTEGER NOT NULL DEFAULT 100,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(10,2) DEFAULT 0.00,
  description TEXT,
  bank_info TEXT,
  drive_folder_url TEXT,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: INSCRIPCIONES / REGISTROS
CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  dni TEXT NOT NULL,
  email TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  payment_method TEXT DEFAULT 'Gratuito',
  payment_status TEXT DEFAULT 'Exento', -- 'Exento', 'En Revisión', 'Pagado', 'Rechazado'
  receipt_url TEXT,
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas (por código de QR, DNI o evento)
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_code ON public.registrations(code);
CREATE INDEX IF NOT EXISTS idx_registrations_dni ON public.registrations(dni);

-- 3. HABILITAR SEGURIDAD A NIVEL DE FILAS (Row Level Security - RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para uso con clave anónima (anon public key)
-- Permitir lectura y escritura de eventos e inscripciones
DROP POLICY IF EXISTS "Permitir lectura publica de eventos" ON public.events;
CREATE POLICY "Permitir lectura publica de eventos" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificacion de eventos" ON public.events;
CREATE POLICY "Permitir modificacion de eventos" ON public.events FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura de inscripciones" ON public.registrations;
CREATE POLICY "Permitir lectura de inscripciones" ON public.registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insertar inscripciones" ON public.registrations;
CREATE POLICY "Permitir insertar inscripciones" ON public.registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizar inscripciones" ON public.registrations;
CREATE POLICY "Permitir actualizar inscripciones" ON public.registrations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminar inscripciones" ON public.registrations;
CREATE POLICY "Permitir eliminar inscripciones" ON public.registrations FOR DELETE USING (true);

-- 4. HABILITAR ACTUALIZACIONES EN TIEMPO REAL (SUPABASE REALTIME)
-- Esto permite que cuando un usuario se inscriba o se valide un QR,
-- la pantalla del Dashboard se actualice instantáneamente sin recargar.
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.events, public.registrations;
COMMIT;
