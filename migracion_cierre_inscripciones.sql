-- =======================================================================
-- EVENTOS ÁGAPE - CIERRE DE INSCRIPCIONES + ALTAS MANUALES DEL ADMINISTRADOR
-- =======================================================================
-- Ejecutar completo en el SQL Editor de Supabase (se puede repetir sin problema).
-- DEBE ejecutarse ANTES de subir el nuevo index.html / inscripcion.js.
--
-- Qué hace:
--   1. Agrega a los eventos dos columnas:
--        registration_open  (true/false)  interruptor manual "inscripciones abiertas".
--        auto_close         (true/false)  si es true, las inscripciones se cierran solas
--                                         cuando llega la fecha y hora del evento.
--      Los eventos que ya existen quedan ABIERTOS y sin cierre automático:
--      nada cambia para ellos hasta que tú lo decidas.
--        registration_deadline (fecha, opcional) día límite de inscripción: las inscripciones
--                                         se cierran al terminar ese día (hora de Honduras).
--   2. Crea la función event_accepts_registrations(): dice si un evento admite inscripciones.
--   3. La política de inscripción pública ahora también exige que el evento esté abierto.
--      (El cierre se aplica en la base de datos, no solo en la pantalla.)
--   4. Nueva política: el administrador puede inscribir personas desde el panel aunque
--      el evento esté cerrado o lleno, y con menos datos (por ejemplo, sin celular).
--
-- No toca las demás políticas, funciones ni datos.
-- =======================================================================

BEGIN;

-- 1. Columnas -----------------------------------------------------------
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_open boolean NOT NULL DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS auto_close boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_deadline date;   -- día límite (opcional); cierra al terminar ese día

-- 2. ¿El evento admite inscripciones ahora mismo? -----------------------
-- La fecha del evento se guarda como texto 'AAAA-MM-DDTHH:MM' en hora de Honduras (UTC-6).
-- Si el texto no tiene ese formato, el cierre automático no se aplica (nunca falla).
CREATE OR REPLACE FUNCTION public.event_accepts_registrations(p_event_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce((
    SELECT e.registration_open
       AND CASE
             WHEN e.auto_close AND e.date ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
               THEN now() < (substring(e.date from '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}')::timestamp
                             AT TIME ZONE 'America/Tegucigalpa')
             ELSE true
           END
       AND CASE
             WHEN e.registration_deadline IS NOT NULL
               THEN now() < ((e.registration_deadline + 1)::timestamp AT TIME ZONE 'America/Tegucigalpa')
             ELSE true
           END
    FROM public.events e
    WHERE e.id = p_event_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.event_accepts_registrations(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_accepts_registrations(text) TO anon, authenticated;

-- 3. Inscripción pública: mismas reglas de antes + evento abierto ---------
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
    AND event_accepts_registrations(event_id)
  );

-- 4. Altas manuales del administrador (puerta del evento, llamadas, etc.) --
DROP POLICY IF EXISTS regs_insert_admin ON public.registrations;
CREATE POLICY regs_insert_admin ON public.registrations
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

COMMIT;
