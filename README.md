# Eventos Ágape

Sistema de gestión de eventos del Ministerio Internacional Ágape: inscripción pública con pase QR, panel de administración, control de acceso por cámara y comprobantes de pago guardados en Google Drive.

Es una página estática (sin servidor propio): HTML + JavaScript en GitHub Pages, base de datos en **Supabase** y subida de comprobantes mediante **Google Apps Script**.

---

## Qué hace

- **Panel de administración** (`index.html`): crear y borrar eventos, ver inscritos en tiempo real, cambiar el estado de pago, marcar asistencia, exportar a CSV, generar pases QR. Requiere iniciar sesión.
- **Inscripción pública** (`inscripcion.html?evento=ID`): cada evento tiene su propio enlace. El asistente deja nombre, celular y edad, y recibe un pase con código QR (guardar imagen, WhatsApp, imprimir).
- **Eventos gratuitos o de pago:** los de pago muestran los canales (BAC, PayPal, POS, efectivo) y piden comprobante cuando corresponde. Las fotos se comprimen en el navegador antes de subirse.
- **Validación en la entrada:** escáner de QR con la cámara o código manual. Avisa si el pase ya ingresó, si es de otro evento, si el pago está pendiente o en revisión, y **niega el acceso si el pago fue rechazado**.
- **Cupos y duplicados:** el cupo máximo y el nombre + celular repetido se controlan en la base de datos.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Panel de administración |
| `inscripcion.html` + `inscripcion.js` | Página pública de inscripción |
| `config.js` | URLs y claves públicas (Supabase y Apps Script) |
| `estilos.css` | Tailwind ya compilado (ver nota abajo) |
| `tailwind.config.js`, `entrada.css` | Archivos para volver a generar `estilos.css` |
| `supabase_schema.sql` | Esquema completo de la base de datos y sus políticas de seguridad |
| `google_apps_script.js` | Código del webhook que guarda comprobantes en Drive |
| `.github/workflows/mantener-supabase-activo.yml` | Consulta Supabase lunes y jueves para que el plan gratuito no se pause |
| `Logo.png` | Logo |

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com/).
2. **SQL Editor:** pega todo `supabase_schema.sql` y ejecútalo.
3. **Authentication > Users:** crea el usuario administrador (correo y contraseña).
4. **Authentication > Sign In / Providers:** desactiva *Allow new users to sign up*.
5. Autoriza ese correo en el SQL Editor (una sola vez):
   ```sql
   INSERT INTO public.admin_emails (email) VALUES ('correo-del-admin@ejemplo.com');
   ```
6. **Project Settings > API:** copia *Project URL* y *anon public key*.

> La clave `anon` es pública por diseño (viaja en `config.js`). Lo que protege los datos son las políticas de seguridad (RLS) de `supabase_schema.sql`. **Nunca pongas la clave `service_role` en este proyecto.**

### 2. Google Apps Script
1. En [script.google.com](https://script.google.com) crea un proyecto y pega `google_apps_script.js`.
2. **Implementar > Nueva implementación > Aplicación web**: ejecutar como *Yo*, acceso *Cualquier persona*.
3. Copia la URL que termina en `/exec`.
4. Cada vez que cambies el código: **Implementar > Administrar implementaciones > editar > Nueva versión**. Guardar no basta.

### 3. `config.js`
```javascript
window.APP_CONFIG = {
  WEBHOOK_URL: "https://script.google.com/macros/s/.../exec",
  SUPABASE_URL: "https://tu-proyecto.supabase.co",
  SUPABASE_ANON_KEY: "eyJ..."
};
```

### 4. Publicar en GitHub Pages
1. Sube **todos** los archivos de este repositorio (incluidos `inscripcion.js`, `estilos.css` y `Logo.png`).
2. **Settings > Pages:** rama `main`, carpeta `/ (root)`.
3. El panel queda en `https://TU-USUARIO.github.io/TU-REPO/` y los enlaces de inscripción salen del botón *Copiar Link Público* de cada evento.

### 5. Mantener Supabase activo (opcional, recomendado)
El workflow necesita dos secretos en **Settings > Secrets and variables > Actions**: `SUPABASE_URL` y `SUPABASE_ANON_KEY`. Si Supabase no responde, GitHub te avisa por correo.

## Notas para quien mantenga el código

- **`estilos.css` es Tailwind compilado.** Si agregas clases nuevas en el HTML o en `inscripcion.js`, no tendrán estilo hasta regenerarlo:
  ```bash
  npx tailwindcss@3 -i entrada.css -o estilos.css --minify
  ```
- **Content Security Policy:** `index.html` e `inscripcion.html` limitan de dónde se cargan scripts y a qué servidores se conectan. Si agregas una librería o servicio externo, hay que añadirlo en la etiqueta `<meta http-equiv="Content-Security-Policy">`.
- **No vuelvas a poner un `DROP PUBLICATION supabase_realtime`**: puede romper el tiempo real de otras tablas.
- Las inscripciones antiguas conservan cédula y correo (se muestran si existen). Las nuevas piden solo nombre, celular y edad.
- Los comprobantes quedan en Drive como "cualquiera con el enlace puede ver". Es lo que permite abrirlos desde el panel con cualquier cuenta; si prefieres que sean privados, solo la cuenta dueña del Drive podrá verlos.
