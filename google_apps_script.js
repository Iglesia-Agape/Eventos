/**
 * =======================================================================
 * EVENTSYNC - GOOGLE APPS SCRIPT WEBHOOK V2 (MEJORADO & ROBUSTO)
 * =======================================================================
 * Este script se encarga de:
 * 1. Probar la conexión entre tu aplicación web y Google Drive (doGet y ping).
 * 2. Crear automáticamente una carpeta principal ("Eventos - Comprobantes") si no existe.
 * 3. Crear o reutilizar subcarpetas por cada evento (usando folderId o eventName).
 * 4. Recibir comprobantes de pago (PNG, JPG, PDF) en Base64, guardarlos en Drive
 *    renombrados y configurar sus permisos para que sean visibles desde el Dashboard.
 * 
 * INSTRUCCIONES DE IMPLEMENTACIÓN:
 * 1. Abre https://script.google.com y crea un "Nuevo proyecto".
 * 2. Borra todo el código que haya y pega este archivo completo.
 * 3. Guarda el proyecto (Ctrl + S) con el nombre: "EventSync Webhook".
 * 4. Haz clic en "Implementar" > "Nueva implementación".
 * 5. Tipo: Selecciona "Aplicación web" (icono de engranaje).
 * 6. Configuración obligatoria:
 *    - Descripción: "Versión 2 - EventSync Drive API"
 *    - Ejecutar como: "Yo" (tu_cuenta@gmail.com)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone / Incluso anónimos)
 *      * IMPORTANTE: Si seleccionas "Solo yo", la app web no podrá subir archivos.
 * 7. Haz clic en "Implementar", autoriza los permisos de Google Drive.
 * 8. Copia la "URL de la aplicación web" (termina en /exec) y pégala en la
 *    Configuración de tu aplicación web EventSync.
 * =======================================================================
 */

// Nombre de la carpeta principal en la raíz de tu Google Drive
var ROOT_FOLDER_NAME = "Eventos - Comprobantes";

/**
 * Manejador GET: Permite verificar en el navegador que el script está activo
 * y responde con un JSON de estado.
 */
function doGet(e) {
  var response = {
    success: true,
    status: "active",
    message: "EventSync Webhook de Google Apps Script funcionando correctamente.",
    timestamp: new Date().toISOString()
  };
  return createJsonResponse(response);
}

/**
 * Manejador POST: Procesa las acciones desde la aplicación web
 */
function doPost(e) {
  try {
    // 1. Validar que vengan datos
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "No se recibieron datos en la solicitud POST."
      });
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        error: "Error al decodificar JSON: " + parseErr.message
      });
    }

    var action = payload.action || "";

    // ACCIÓN: Prueba de conexión (Ping)
    if (action === "ping" || action === "test_connection") {
      return createJsonResponse({
        success: true,
        message: "Conexión exitosa con Google Apps Script y Google Drive.",
        timestamp: new Date().toISOString()
      });
    }

    // ACCIÓN: Crear o buscar carpeta del evento
    if (action === "create_folder") {
      var eventTitle = payload.eventName || "Evento sin título";
      var folder = getOrCreateEventFolder(eventTitle);
      
      return createJsonResponse({
        success: true,
        folderId: folder.getId(),
        folderUrl: folder.getUrl(),
        folderName: folder.getName(),
        message: "Carpeta de evento lista en Google Drive."
      });
    }

    // ACCIÓN: Subir comprobante de pago
    if (action === "upload_receipt") {
      var fileDataBase64 = payload.fileDataBase64;
      var fileName = payload.fileName || ("Comprobante_" + Date.now() + ".jpg");
      var fileType = payload.fileType || "image/jpeg";
      var folderId = payload.folderId || "";
      var eventName = payload.eventName || "Evento General";

      if (!fileDataBase64) {
        return createJsonResponse({
          success: false,
          error: "No se proporcionó el contenido del archivo en base64."
        });
      }

      // Si el base64 viene con el prefijo 'data:*/*;base64,', limpiarlo
      if (fileDataBase64.indexOf(",") > -1) {
        fileDataBase64 = fileDataBase64.split(",")[1];
      }

      // Obtener o resolver la carpeta destino
      var targetFolder = null;
      if (folderId && folderId.trim() !== "") {
        try {
          targetFolder = DriveApp.getFolderById(folderId.trim());
        } catch (fErr) {
          // Si el ID guardado no existe o no es accesible, buscar por nombre
          Logger.log("FolderId no encontrado, buscando por nombre de evento: " + fErr.message);
        }
      }

      if (!targetFolder) {
        targetFolder = getOrCreateEventFolder(eventName);
      }

      // Decodificar Base64 a Blob
      var decodedBytes = Utilities.base64Decode(fileDataBase64);
      var blob = Utilities.newBlob(decodedBytes, fileType, fileName);

      // Guardar archivo en la carpeta de Drive
      var file = targetFolder.createFile(blob);

      // Configurar permisos de lectura para que el enlace sea accesible desde el Dashboard
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        Logger.log("Advertencia al compartir archivo: " + shareErr.message);
      }

      // Obtener URLs del archivo
      var fileUrl = file.getUrl();
      var downloadUrl = file.getDownloadUrl();

      return createJsonResponse({
        success: true,
        fileId: file.getId(),
        fileName: file.getName(),
        fileUrl: fileUrl,
        downloadUrl: downloadUrl,
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl(),
        message: "Comprobante guardado exitosamente en Google Drive."
      });
    }

    // Si la acción no coincide con ninguna
    return createJsonResponse({
      success: false,
      error: "Acción no reconocida: '" + action + "'. Acciones válidas: ping, create_folder, upload_receipt."
    });

  } catch (globalErr) {
    Logger.log("Error crítico en doPost: " + globalErr.toString());
    return createJsonResponse({
      success: false,
      error: "Error interno del servidor en Google Apps Script: " + globalErr.toString()
    });
  }
}

/**
 * Busca o crea la carpeta principal de eventos ("Eventos - Comprobantes")
 * y dentro de ella busca o crea la subcarpeta específica del evento.
 */
function getOrCreateEventFolder(eventName) {
  var rootFolder = null;
  var rootFolders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);

  if (rootFolders.hasNext()) {
    rootFolder = rootFolders.next();
  } else {
    rootFolder = DriveApp.createFolder(ROOT_FOLDER_NAME);
    try {
      rootFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}
  }

  // Sanitizar nombre de la subcarpeta
  var cleanEventName = eventName.toString().trim().replace(/[\\/:*?"<>|]/g, "_");
  if (!cleanEventName) cleanEventName = "Evento";

  // Buscar si ya existe la subcarpeta dentro de la carpeta principal
  var eventFolders = rootFolder.getFoldersByName(cleanEventName);
  var eventFolder = null;

  if (eventFolders.hasNext()) {
    eventFolder = eventFolders.next();
  } else {
    eventFolder = rootFolder.createFolder(cleanEventName);
    try {
      eventFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}
  }

  return eventFolder;
}

/**
 * Retorna una salida de texto formateada como JSON
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
