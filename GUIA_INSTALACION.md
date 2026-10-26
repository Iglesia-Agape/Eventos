# Guía de pruebas y actualización

Para la instalación inicial sigue el [README](README.md). Esta guía sirve para **actualizar** el webhook de Google y **probar** que todo funciona de punta a punta.

---

## 1. Actualizar el webhook de Google Apps Script

Cada vez que cambies `google_apps_script.js`:

1. Abre tu proyecto en [script.google.com](https://script.google.com), borra el código y pega el contenido actualizado del archivo.
2. Guarda (Ctrl/Cmd + S).
3. **Implementar > Administrar implementaciones**, haz clic en el lápiz de la implementación activa.
4. En *Versión* elige **Nueva versión** y pulsa **Implementar**.
   - Ejecutar como: *Yo*.
   - Quién tiene acceso: *Cualquier persona*.
5. La URL `/exec` no cambia. Si cambiara, actualízala en `config.js`.

Si no creas una *Nueva versión*, el script viejo sigue respondiendo.

El webhook solo acepta comprobantes JPG, PNG o PDF de hasta 10 MB.

## 2. Probar el flujo completo

Usa un evento de prueba y bórralo al terminar.

1. **Crear evento.** En el panel, *Crear Evento* (tipo *De Pago*). Debe aparecer el botón *Ver en Drive* y una subcarpeta nueva en *Eventos - Comprobantes*.
2. **Inscribir a dos personas distintas** desde el enlace público (*Copiar Link Público*), en una ventana de incógnito:
   - Una con transferencia BAC y foto de comprobante (queda *En Revisión*).
   - Otra con nombre y celular distintos, pagando en efectivo (queda *Pendiente Pago*).
   - Las dos deben recibir su pase. Si la segunda falla, revisa el índice `uq_registrations_event_dni` en `supabase_schema.sql`.
3. **Probar un duplicado.** Repite el nombre y celular de la primera persona: debe rechazarse con un mensaje de inscripción repetida.
4. **Revisar el panel.** Las dos personas aparecen en vivo. En *Ver en Drive* se abre el comprobante.
5. **Validar la entrada** (pestaña *Validación & QR*):
   - Escanea o escribe el código de la primera: acceso concedido con aviso de "comprobante en revisión".
   - Vuelve a escanearlo: avisa que ya ingresó.
   - Cambia el pago de la segunda a *Rechazado* y valídala: debe **negar** el acceso.
6. **Probar otro evento.** Crea un segundo evento y valida en él el código de una persona del primero: debe decir "Pase de otro evento".
7. **Borrar el evento de prueba** (también se borran sus inscripciones).

## 3. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| "No pudimos completar tu inscripción" | Consola del navegador (F12). Suele ser una política RLS o un índice único de Supabase. |
| El comprobante no sube | Abre la URL del webhook en el navegador: debe responder `"status":"active"`. Revisa que sea una *Nueva versión* con acceso *Cualquier persona*. |
| El panel no actualiza en vivo | Supabase > Database > Replication: `events` y `registrations` deben estar activas. |
| La página abre en blanco o sin estilos | Que `config.js`, `estilos.css`, `inscripcion.js` y `Logo.png` estén subidos al repositorio. |
| Un estilo nuevo no se ve | `estilos.css` hay que regenerarlo (ver README, "Notas para quien mantenga el código"). |
| Diagnóstico de conexiones | En el panel, 5 clics rápidos sobre el logo abren la prueba de Drive y Supabase. |
