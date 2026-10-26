/**
 * =======================================================================
 * EVENTSYNC - ARCHIVO DE CONFIGURACIÓN CENTRAL (config.js)
 * =======================================================================
 * Credenciales y URLs activas para Google Drive y Supabase Cloud.
 * =======================================================================
 */

window.APP_CONFIG = {
  // 1. Google Apps Script Webhook (Google Drive)
  WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbz_EVEyldCBITgBrfHimOtVs-SSDqdlvfpHh1pGgGnk0_VUnr1zP4St8pB7M1d6VbjsIg/exec",

  // 2. Supabase Cloud (Project URL limpia sin /rest/v1)
  SUPABASE_URL: "https://gnnxwhrqdyubiaspczuw.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdubnh3aHJxZHl1Ymlhc3BjenV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3OTUzMTcsImV4cCI6MjEwODM3MTMxN30.BCkVt-MEWFXgtCXDfPo_OC7NCrVa5TpyKkWcz2FqtFg",

  // 3. Opciones generales
  DEFAULT_CAPACITY: 100,
  AUTO_SYNC_SUPABASE: true
};
