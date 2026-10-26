-- =======================================================================
-- EVENTOS ÁGAPE - ESQUEMA DE SUPABASE (refleja el proyecto en producción)
-- =======================================================================
-- Sirve para recrear el proyecto desde cero y como documentación.
-- Es seguro correrlo varias veces, PERO en un proyecto que ya funciona
-- NO es necesario: ya está aplicado. Si lo corres sobre uno existente,
-- reemplaza las políticas por las de este archivo.
--
-- Instrucciones (proyecto nuevo):
-- 1. Supabase > SQL Editor > New query > pega este archivo > Run.
-- 2. Authentication > Users: crea el usuario administrador (correo y contraseña).
-- 3. Authentication > Sign In / Providers: desactiva "Allow new users to sign up".
-- 4. Agrega el correo del administrador (ver el INSERT al final de este archivo).
-- 5. Copia Project URL y anon public key a config.js.
--
-- Modelo de seguridad:
--   - Público (anon): puede LEER eventos e INSCRIBIRSE (insertar). Nada más.
--   - Administrador (is_admin()): leer, editar y borrar todo.
--   - La clave anon es pública (está en config.js): la seguridad real son estas políticas.
-- =======================================================================

-- 1. TABLAS ------------------------------------------------------------

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

CREATE TABLE IF NOT EXISTS public.registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,                       -- celular (inscripciones nuevas)
  age INTEGER,                      -- edad (inscripciones nuevas)
  dni TEXT,                         -- solo inscripciones antiguas
  email TEXT,                       -- solo inscripciones antiguas
  is_paid BOOLEAN DEFAULT false,
  payment_method TEXT DEFAULT 'Gratuito',
  payment_status TEXT DEFAULT 'Exento', -- 'Exento', 'En Revisión', 'Pendiente Pago...', 'Pagado', 'Rechazado'
  receipt_url TEXT,
  attended BOOLEAN DEFAULT false,
  attended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si vienes del esquema anterior (con dni y email obligatorios):
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.registrations ALTER COLUMN dni DROP NOT NULL;
ALTER TABLE public.registrations ALTER COLUMN email DROP NOT NULL;

-- Administradores: correos autorizados a usar el panel
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: nadie puede leer ni escribir esta tabla por la API.
-- Solo is_admin() (SECURITY DEFINER) la consulta.

-- 2. FUNCIONES DE NORMALIZACIÓN (para detectar duplicados) -------------

CREATE OR REPLACE FUNCTION public.normalizar_celular(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '^504(\d{8})$', '\1');
$$;

CREATE OR REPLACE FUNCTION public.normalizar_dni(p_dni text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(coalesce(p_dni, ''), '[\s\.\-]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.normalizar_nombre(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(coalesce(p, ''), '\s+', '', 'g'));
$$;

-- 3. ÍNDICES -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_code ON public.registrations(code);
CREATE INDEX IF NOT EXISTS idx_registrations_dni ON public.registrations(dni);

-- Mismo nombre + mismo celular en un evento = duplicado
CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_event_name_phone
  ON public.registrations (event_id, public.normalizar_nombre(name), public.normalizar_celular(phone))
  WHERE phone IS NOT NULL;

-- Misma cédula en un evento = duplicado (solo inscripciones antiguas con cédula).
-- IMPORTANTE: debe ignorar las cédulas vacías; si no, solo una persona sin cédula
-- podría inscribirse por evento.
DROP INDEX IF EXISTS public.uq_registrations_event_dni;
CREATE UNIQUE INDEX uq_registrations_event_dni
  ON public.registrations (event_id, public.normalizar_dni(dni))
  WHERE dni IS NOT NULL AND public.normalizar_dni(dni) <> '';

-- 4. FUNCIONES USADAS POR LA APP ---------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE OR REPLACE FUNCTION public.event_registration_count(p_event_id text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int FROM public.registrations WHERE event_id = p_event_id;
$$;

CREATE OR REPLACE FUNCTION public.event_has_capacity(p_event_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(
    (SELECT count(*) FROM public.registrations r WHERE r.event_id = p_event_id)
    < (SELECT e.capacity FROM public.events e WHERE e.id = p_event_id), false);
$$;

CREATE OR REPLACE FUNCTION public.inscripcion_duplicada(p_event_id text, p_name text, p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registrations
    WHERE event_id = p_event_id
      AND phone IS NOT NULL
      AND public.normalizar_nombre(name) = public.normalizar_nombre(p_name)
      AND public.normalizar_celular(phone) = public.normalizar_celular(p_phone)
  );
$$;

-- 5. SEGURIDAD A NIVEL DE FILAS (RLS) ----------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Quitar las políticas permisivas del esquema antiguo, si existieran
DROP POLICY IF EXISTS "Permitir lectura publica de eventos" ON public.events;
DROP POLICY IF EXISTS "Permitir modificacion de eventos" ON public.events;
DROP POLICY IF EXISTS "Permitir lectura de inscripciones" ON public.registrations;
DROP POLICY IF EXISTS "Permitir insertar inscripciones" ON public.registrations;
DROP POLICY IF EXISTS "Permitir actualizar inscripciones" ON public.registrations;
DROP POLICY IF EXISTS "Permitir eliminar inscripciones" ON public.registrations;

-- Eventos
DROP POLICY IF EXISTS events_select_public ON public.events;
CREATE POLICY events_select_public ON public.events
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS events_insert_admin ON public.events;
CREATE POLICY events_insert_admin ON public.events
  FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS events_update_admin ON public.events;
CREATE POLICY events_update_admin ON public.events
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS events_delete_admin ON public.events;
CREATE POLICY events_delete_admin ON public.events
  FOR DELETE TO authenticated USING (is_admin());

-- Inscripciones: el público solo puede insertar, con datos válidos y sin poder
-- marcarse como pagado ni como asistente; y solo si hay cupo.
DROP POLICY IF EXISTS regs_insert_public ON public.registrations;
CREATE POLICY regs_insert_public ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    COALESCE(attended, false) = false
    AND payment_status = ANY (ARRAY['Exento', 'En Revisión', 'Pendiente Pago', 'Pendiente Pago (POS)', 'Pendiente Pago (Efectivo)'])
    AND char_length(name) BETWEEN 3 AND 120
    AND phone IS NOT NULL AND char_length(phone) BETWEEN 6 AND 25
    AND age BETWEEN 1 AND 120
    AND (dni IS NULL OR char_length(dni) <= 40)
    AND (email IS NULL OR char_length(email) <= 160)
    AND (receipt_url IS NULL OR receipt_url = '' OR receipt_url ~ '^https://')
    AND event_has_capacity(event_id)
  );

DROP POLICY IF EXISTS regs_select_admin ON public.registrations;
CREATE POLICY regs_select_admin ON public.registrations
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS regs_update_admin ON public.registrations;
CREATE POLICY regs_update_admin ON public.registrations
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS regs_delete_admin ON public.registrations;
CREATE POLICY regs_delete_admin ON public.registrations
  FOR DELETE TO authenticated USING (is_admin());

-- 6. TIEMPO REAL -------------------------------------------------------
-- NO se borra ni recrea la publicación (eso puede romper otras tablas).
-- Solo se agregan las tablas si faltan.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                 WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  END IF;
END $$;

-- 7. PRIMER ADMINISTRADOR (cambia el correo y córrelo UNA vez) ----------
-- INSERT INTO public.admin_emails (email) VALUES ('correo-del-admin@ejemplo.com')
--   ON CONFLICT DO NOTHING;
