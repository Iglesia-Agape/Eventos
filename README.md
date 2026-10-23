# ⚡ EventSync - Sistema de Gestión de Eventos, Pagos & Google Drive

EventSync es una plataforma web completa y moderna para la administración de eventos simultáneos, registro público de asistentes, subida automática de comprobantes de pago a Google Drive y validación de accesos mediante código QR en tiempo real.

---

## 🎯 Características Principales

- **Gestión Multievento:** Administra múltiples eventos activos desde un solo panel.
- **Enlaces Públicos Independientes:** Genera URLs únicas (`?evento=evt-XXXXX`) para compartir con los asistentes.
- **Integración con Google Drive:**
  - Crea automáticamente la subcarpeta del evento dentro de *"Eventos - Comprobantes"*.
  - Renombra y sube los comprobantes de pago bancario en tiempo real.
  - Botón *"Ver en Drive"* para abrir la carpeta o el comprobante directamente.
- **Compresión de Fotos en el Navegador:** Optimiza fotos pesadas de celulares en milisegundos antes de subirlas a Drive.
- **Pase Digital con Código QR:** Genera un ticket único para cada participante con opciones para imprimir o compartir por WhatsApp.
- **Escáner por Cámara Web & Control de Asistencia:** Detección de QR, tono sonoro de confirmación y advertencia de pases duplicados.
- **Sincronización en la Nube con Supabase:** Persistencia centralizada y actualización en tiempo real (*Realtime*) en múltiples computadoras y dispositivos.
- **Protección de Credenciales:** La configuración del Webhook y Base de Datos está centralizada en `config.js` y no se expone en la interfaz pública.

---

## 💡 ¿Cómo funciona la Base de Datos? (¿Una tabla por evento?)

> **Pregunta frecuente:** *¿Cada evento que creo en la app es una tabla diferente en Supabase?*
>
> **Respuesta:** **No**, y esa es la gran ventaja del diseño relacional profesional.
>
> En lugar de obligarte a entrar a Supabase a escribir código SQL cada vez que creas un evento, el sistema utiliza dos tablas fijas:
> 1. `public.events`: Almacena todos los eventos (título, fecha, capacidad, precio, carpeta de Drive, etc.).
> 2. `public.registrations`: Almacena todas las personas inscritas, vinculadas a su evento mediante `event_id`.
>
> **Ventajas de este modelo:**
> - **Creación 100% Automática:** Cuando creas un evento desde la página web, se guarda automáticamente en Supabase sin necesidad de crear tablas nuevas.
> - **Cero Mantenimiento:** Una vez ejecutado el script SQL inicial, nunca más tendrás que tocar el editor SQL de Supabase.
> - **Tiempo Real Global:** Supabase Realtime funciona automáticamente para todos los eventos presentes y futuros.

---

## 🚀 Puesta en Marcha Rápida

### 1. Configurar Supabase (Paso Único)
1. Entra a [supabase.com](https://supabase.com/) y abre tu proyecto.
2. Ve a **SQL Editor**, copia todo el contenido del archivo [`supabase_schema.sql`](supabase_schema.sql) y haz clic en **Run**.
3. Ve a **Project Settings** > **API** y copia:
   - **Project URL**
   - **anon public key**

### 2. Configurar Google Apps Script
1. Entra a [script.google.com](https://script.google.com) y pega el código de [`google_apps_script.js`](google_apps_script.js).
2. Haz clic en **Implementar** > **Nueva implementación** > Tipo: **Aplicación web**.
   - **Ejecutar como:** *Yo*
   - **Quién tiene acceso:** *Cualquier persona* (Anyone)
3. Copia la URL que termina en `/exec`.

### 3. Configurar tus Credenciales en `config.js`
Abre el archivo [`config.js`](config.js) y pega tus credenciales:
```javascript
window.APP_CONFIG = {
  WEBHOOK_URL: "https://script.google.com/macros/s/.../exec",
  SUPABASE_URL: "https://tu-proyecto.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```

---

## 🌐 Subir el Proyecto a GitHub & Activar GitHub Pages

Para que tu aplicación funcione en cualquier computadora, tablet o teléfono sin depender de tu máquina local:

### Opción A: Usando la terminal (Git)
Si tienes Git instalado en tu computadora:
```powershell
# 1. En la carpeta del proyecto:
git init
git add .
git commit -m "Versión inicial de EventSync"
git branch -M main

# 2. Conecta con tu repositorio en GitHub:
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

*(Si aún no tienes Git instalado en Windows, puedes instalarlo abriendo PowerShell y ejecutando: `winget install --id Git.Git -e --source winget`)*.

### Opción B: Subir directamente en GitHub.com
1. Entra a [github.com](https://github.com/) y haz clic en **New repository** (Ejemplo: `eventsync`).
2. Haz clic en **"uploading an existing file"**.
3. Arrastra los archivos:
   - `index.html`
   - `config.js`
   - `google_apps_script.js`
   - `supabase_schema.sql`
   - `.gitignore`
   - `README.md`
4. Haz clic en **Commit changes**.

---

## 🌍 Activar GitHub Pages (Tu App Gratis en la Web)

Una vez subido a GitHub:
1. En tu repositorio, entra a la pestaña **Settings** (Configuración del repositorio).
2. En el menú izquierdo, busca la sección **Pages**.
3. En **Build and deployment** > **Branch**:
   - Selecciona **main** y carpeta **/ (root)**.
   - Haz clic en **Save**.
4. En 1 minuto tendrás tu enlace oficial disponible:
   `https://tu-usuario.github.io/tu-repositorio/`

¡Cualquier persona con este enlace podrá ingresar, ver los eventos, inscribirse y validar pases desde cualquier lugar del mundo!
