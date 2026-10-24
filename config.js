/**
 * =======================================================================
 * EVENTSYNC - ARCHIVO DE CONFIGURACIÓN CENTRAL (config.js)
 * =======================================================================
 * Este archivo centraliza las credenciales y URLs de tu proyecto.
 * Al estar separado de index.html:
 * 1. Nadie desde la pantalla del Dashboard podrá modificar o alterar la conexión.
 * 2. Si subes este código a GitHub o GitHub Pages, todos los dispositivos
 *    (computadoras, celulares, tablets) se conectarán automáticamente a la
 *    misma base de datos de Supabase y a tu misma carpeta de Google Drive.
 * 
 * INSTRUCCIONES:
 * - Coloca aquí la URL de tu Webhook de Google Apps Script.
 * - Coloca aquí tu URL de Supabase y tu clave pública (anon key).
 * =======================================================================
 */

window.APP_CONFIG = {
  // 1. URL de tu Webhook de Google Apps Script (termina en /exec)
  // Aquí se enviarán las solicitudes para crear carpetas en Drive y subir comprobantes.
  WEBHOOK_URL: "https://script.google.com/macros/s/https://https://script.google.com/macros/s/AKfycbz_EVEyldCBITgBrfHimOtVs-SSDqdlvfpHh1pGgGnk0_VUnr1zP4St8pB7M1d6VbjsIg/exec",

  // 2. Credenciales de Supabase (Para sincronización en la nube y tiempo real)
  // Obtén estos valores en tu panel de Supabase: Project Settings > API
  SUPABASE_URL: "https://gnnxwhrqdyubiaspczuw.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdubnh3aHJxZHl1Ymlhc3BjenV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3OTUzMTcsImV4cCI6MjEwODM3MTMxN30.BCkVt-MEWFXgtCXDfPo_OC7NCrVa5TpyKkWcz2FqtFg",

  // 3. Opciones generales
  DEFAULT_CAPACITY: 100,
  AUTO_SYNC_SUPABASE: true, // Sincroniza automáticamente en tiempo real
  ADMIN_PIN: "1234"         // PIN de acceso para panel de soporte técnico (opcional)
};
