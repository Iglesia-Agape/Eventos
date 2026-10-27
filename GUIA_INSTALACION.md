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

## 2.b Probar cierre de inscripciones y altas manuales

**Orden de actualización (importante):** primero ejecuta `migracion_cierre_inscripciones.sql` en el SQL Editor (si ya la ejecutaste antes, vuelve a ejecutarla: agrega la fecha límite sin tocar lo demás) de Supabase; después sube `index.html`, `inscripcion.js`, `estilos.css` y `supabase_schema.sql` al repositorio. Al abrir el panel, refresca con Ctrl/Cmd + Shift + R.

1. **Cierre manual.** En un evento de prueba, pulsa el botón *Inscripciones abiertas* (arriba; al pulsarlo cambia a cerrado). Abre el enlace público en incógnito: debe decir "Inscripciones cerradas". Vuelve a abrirlas y comprueba que el formulario regresa.
2. **Cierre automático.** Edita el evento, marca *Cerrar las inscripciones automáticamente cuando comience el evento* y pon una fecha pasada: el enlace público debe mostrar "cerradas". Con fecha futura, sigue abierto.
2.b. **Fecha límite.** Edita el evento y elige una *Fecha límite de inscripción* dentro de 5 días: el panel y el enlace público deben decir "Quedan 5 días para inscribirse". Con la fecha de hoy dicen "Último día para inscribirse (hoy)" y todavía se puede inscribir; con la de ayer queda cerrado. El botón *Quitar* la elimina (es opcional).
3. **Quien ya se inscribió** y vuelve a abrir su enlace sigue viendo su pase, aunque el evento esté cerrado o lleno.
4. **Alta en la puerta.** Con el evento cerrado, pulsa *Inscribir persona* en el panel: registra a alguien sin celular ni edad. Debe aparecer en la tabla y mostrar su pase.
5. **Corregir un dato.** En la fila de esa persona pulsa el lápiz, cambia el nombre y guarda: se actualiza sin crear otra inscripción.

## 3. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| "No pudimos completar tu inscripción" | Consola del navegador (F12). Suele ser una política RLS o un índice único de Supabase. |
| El comprobante no sube | Abre la URL del webhook en el navegador: debe responder `"status":"active"`. Revisa que sea una *Nueva versión* con acceso *Cualquier persona*. |
| El panel no actualiza en vivo | Supabase > Database > Replication: `events` y `registrations` deben estar activas. |
| La página abre en blanco o sin estilos | Que `config.js`, `estilos.css`, `inscripcion.js` y `Logo.png` estén subidos al repositorio. |
| Un estilo nuevo no se ve | `estilos.css` hay que regenerarlo (ver README, "Notas para quien mantenga el código"). |
| El panel dice que no puede agregar o cerrar | Falta ejecutar `migracion_cierre_inscripciones.sql` en Supabase. |
| Diagnóstico de conexiones | En el panel, 5 clics rápidos sobre el logo abren la prueba de Drive y Supabase. |
