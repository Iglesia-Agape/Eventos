# 🚀 Guía de Puesta en Marcha: EventSync & Google Drive

Esta guía explica paso a paso cómo actualizar tu script de **Google Apps Script**, resolver por qué fallaba la subida de comprobantes y probar todo el flujo de inicio a fin.

---

## 🔍 ¿Por qué fallaba el guardado de comprobantes en Google Drive?

Al analizar el código anterior, se identificaron cuatro causas principales por las que fallaba la integración:

1. **Permisos y Nueva Versión en Google Apps Script:**
   En Apps Script, cada vez que modificas el código, **no basta con darle a Guardar**. Es indispensable generar una **"Nueva versión"** en la implementación web. Además, si el acceso no está en *"Cualquier persona"* (Anyone), las peticiones desde el navegador son rechazadas con error 401/403.
2. **Falta de resolución de carpetas inexistentes:**
   Si el evento se creaba antes de configurar el webhook o si el `driveFolderId` cambiaba, el script anterior intentaba guardar en un ID no existente y se rompía sin crear una carpeta de respaldo.
3. **Imágenes de cámaras demasiado pesadas:**
   Las fotos tomadas directamente con celulares modernos pesan entre **5 MB y 15 MB**. Al convertirlas a Base64 sin compresión, saturaban el límite de transferencia del navegador a Google Apps Script, provocando *timeouts* silenciosos.
4. **Permisos de visualización en Drive:**
   Los archivos subidos quedaban privados por defecto, impidiendo que el organizador o el asistente pudieran ver el enlace *"Ver en Drive"* sin iniciar sesión con la cuenta dueña del Drive.

---

## 🛠️ Paso 1: Actualizar Google Apps Script

1. Entra a [Google Apps Script](https://script.google.com/) con tu cuenta de Google.
2. Abre tu proyecto actual (o crea uno nuevo con el nombre **"EventSync Webhook"**).
3. Borra todo el código que tengas en el editor y pega el contenido completo del archivo:
   👉 [`google_apps_script.js`](file:///C:/Users/MEDIA/.gemini/antigravity/scratch/eventsync/google_apps_script.js)
4. Guarda los cambios con **Ctrl + S**.
5. **Implementar la nueva versión (Paso Crítico):**
   - Haz clic en el botón azul superior **Implementar** > **Administrar implementaciones**.
   - Haz clic en el icono del **Lápiz (Editar)** de tu implementación activa.
   - En el menú desplegable **Versión**, selecciona **Nueva versión**.
   - Verifica que los ajustes estén así:
     - **Ejecutar como:** `Yo (tu_correo@gmail.com)`
     - **Quién tiene acceso:** `Cualquier persona` (Anyone / incluso anónimos)
   - Haz clic en **Implementar**.
6. Copia la **URL de la aplicación web** (la que termina en `/exec`).

---

## ⚙️ Paso 2: Configurar y Probar la Conexión en EventSync

1. Abre [`index.html`](file:///C:/Users/MEDIA/.gemini/antigravity/scratch/eventsync/index.html) en tu navegador.
2. Ve a la pestaña **Configuración** en la esquina superior derecha.
3. Pega la URL del Webhook en el campo *Google Apps Script Webhook URL*.
4. Haz clic en el botón **"Probar Conexión con Drive"**:
   - Aparecerá un mensaje verde confirmando: *"¡Conexión Exitosa! Google Apps Script está activo y listo"*.
5. Haz clic en **Guardar Configuración**.

---

## 🧪 Paso 3: Probar la Creación de un Evento desde Cero

1. Ve a la pestaña **Crear Evento**.
2. Completa los datos:
   - **Nombre:** Ej. *Taller de Innovación 2026*
   - **Fecha y Hora:** Elige cualquier fecha futura.
   - **Tipo:** *De Pago* (Ej. `$30.00`).
   - **Datos Bancarios:** (Opcional) *Ej: BAC Cuenta 12345 a nombre de EventSync*.
3. Haz clic en **"Crear Evento & Subcarpeta Drive"**:
   - El sistema contactará automáticamente a Google Apps Script.
   - En tu Google Drive se creará la carpeta principal **"Eventos - Comprobantes"** y dentro de ella la subcarpeta **"Taller de Innovación 2026"**.
   - En el Dashboard aparecerá el botón verde **"Ver en Drive"** que abre directamente la carpeta en una pestaña nueva.

---

## 🎟️ Paso 4: Probar la Inscripción Pública y Subida de Comprobante

1. En el Dashboard, haz clic en **"Copiar Link Público"**.
2. Abre una ventana de incógnito o una pestaña nueva y pega el enlace (`.../index.html?evento=evt-XXXXX`).
3. Llena el formulario como un asistente de prueba:
   - Nombre: *María Rodríguez*
   - DNI: *0801-1995-12345*
   - Correo: *maria@ejemplo.com*
   - Método de Pago: *Transferencia Bancaria*.
   - Adjunta una imagen o PDF de prueba en el comprobante.
4. Haz clic en **"Completar Inscripción & Generar Pase Digital"**:
   - La aplicación web optimizará la imagen en milisegundos mediante Canvas (reduciendo su peso sin perder nitidez).
   - El archivo se subirá a Google Drive renombrado automáticamente como:
     `EVT-[CODIGO] - María Rodríguez - Comprobante.jpg`
   - Se desplegará el **Pase Digital con su Código QR único** y opciones para imprimir o enviar por WhatsApp.

---

## 🔍 Paso 5: Verificar en el Dashboard y Validar Acceso

1. Regresa a la pestaña del **Dashboard** de administración:
   - Verás a *María Rodríguez* en la tabla con estado **"En Revisión"**.
   - Haz clic en **"Ver en Drive"**: se abrirá el comprobante subido en Google Drive.
   - Si el pago es correcto, puedes cambiar el menú desplegable directamente a **"Pagado"**.
2. Ve a la pestaña **Validación & QR**:
   - Activa la cámara web para escanear el QR o escribe el código `EVT-XXXXXX` en la barra manual.
   - Escucharás el tono de confirmación de acceso y el participante quedará marcado automáticamente como **"✓ LLEGÓ"**.

---

## ☁️ Paso 6 (Opcional): Persistencia en Supabase

Si deseas habilitar sincronización en la nube y tiempo real para múltiples dispositivos:
1. Abre [Supabase](https://supabase.com/) y entra a tu proyecto.
2. Ve a **SQL Editor**, copia el contenido de [`supabase_schema.sql`](file:///C:/Users/MEDIA/.gemini/antigravity/scratch/eventsync/supabase_schema.sql) y haz clic en **Run**.
3. En la pestaña **Configuración** de EventSync, pega tu **Project URL** y tu **Anon Key**.
4. Haz clic en **Guardar Supabase** y **Subir Datos Locales**.
