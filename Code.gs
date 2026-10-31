/* ============================================================
   GALERÍA LUZ ELENA OROZCO — BACKEND (Google Apps Script)
   ------------------------------------------------------------
   Este archivo NO contiene datos sensibles. Todo lo privado
   (ID de la carpeta de Drive y credenciales) se guarda en las
   Propiedades del script, que viven solo en el proyecto de
   Apps Script y nunca se suben al repositorio.

   CONFIGURACIÓN (una sola vez, desde el editor de Apps Script):

     configurarGaleria('ID_DE_LA_CARPETA', 'usuario', 'contraseña')

   Para cambiar solo la contraseña:

     configurarCredenciales('usuario', 'nuevaContraseña')

   Endpoint publicado (Web app):
     doGet(?user=...&pass=...&refresh=1)
   ============================================================ */

<<<<<<< HEAD
const FOLDER_ID = 'id-de-tu-carpeta';

const USUARIO_POR_DEFECTO = 'invitado';
const CONTRASENA_POR_DEFECTO = '123456';
=======
/* ── Nombres de las Propiedades del script ── */
const PROP_CARPETA = 'GALERIA_FOLDER_ID';
const PROP_USUARIO = 'GALERIA_USUARIO';
const PROP_CONTRASENA = 'GALERIA_CONTRASENA';
>>>>>>> 4ce477a (Actualiza archivos de configuracion y documentacion)

/* ── Ajustes no sensibles ── */
const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const EXT_VIDEO = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
const CACHE_SEGUNDOS = 300;

/* ============================================================
   ENDPOINT
   ============================================================ */

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    const config = leerConfig_();
    if (!config) {
      return json_({ error: 'Servidor no configurado. Ejecuta configurarGaleria() en Apps Script.' });
    }

    if (!validarCredenciales_(params.user, params.pass, config)) {
      return json_({ error: 'Credenciales inválidas' });
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = 'galeria_' + config.carpetaId;

    if (params.refresh !== '1') {
      const cacheado = cache.get(cacheKey);
      if (cacheado) {
        return json_(JSON.parse(cacheado));
      }
    }

    const resultado = listarMedios_(config.carpetaId);

    try {
      cache.put(cacheKey, JSON.stringify(resultado), CACHE_SEGUNDOS);
    } catch (ignorado) {
      // La caché es opcional: si falla, seguimos sirviendo datos frescos.
    }

    return json_(resultado);
  } catch (err) {
    // El detalle va al registro del servidor, nunca al cliente.
    console.error('doGet: ' + (err && err.stack ? err.stack : err));
    return json_({ error: 'Error del servidor' });
  }
}

/* ============================================================
   CONFIGURACIÓN
   ============================================================ */

/**
 * Guarda la configuración privada en las Propiedades del script.
 * Ejecutar una vez desde el editor de Apps Script.
 *
 * @param {string} carpetaId  ID de la carpeta de Drive con las subcarpetas-categoría.
 * @param {string} usuario    Usuario de acceso a la galería.
 * @param {string} contrasena Contraseña de acceso (usa una larga y única).
 * @return {string} Mensaje de confirmación.
 */
function configurarGaleria(carpetaId, usuario, contrasena) {
  if (!carpetaId || !usuario || !contrasena) {
    throw new Error('Uso: configurarGaleria("ID_CARPETA", "usuario", "contraseña")');
  }

  if (String(contrasena).length < 10) {
    throw new Error('La contraseña debe tener al menos 10 caracteres.');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    [PROP_CARPETA]: String(carpetaId).trim(),
    [PROP_USUARIO]: String(usuario).trim(),
    [PROP_CONTRASENA]: String(contrasena)
  });

  return 'Galería configurada correctamente.';
}

/**
 * Cambia solo las credenciales, sin tocar la carpeta.
 */
function configurarCredenciales(usuario, contrasena) {
  if (!usuario || !contrasena) {
    throw new Error('Uso: configurarCredenciales("usuario", "contraseña")');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    [PROP_USUARIO]: String(usuario).trim(),
    [PROP_CONTRASENA]: String(contrasena)
  });

  return 'Credenciales actualizadas correctamente.';
}

/**
 * Muestra qué está configurado (sin revelar la contraseña).
 * Útil para comprobar el despliegue.
 */
function verConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  const carpeta = props.getProperty(PROP_CARPETA);
  const usuario = props.getProperty(PROP_USUARIO);
  const contrasena = props.getProperty(PROP_CONTRASENA);

  return {
    carpetaConfigurada: Boolean(carpeta),
    carpetaId: carpeta ? carpeta.slice(0, 6) + '…' : null,
    usuario: usuario || null,
    contrasenaConfigurada: Boolean(contrasena),
    longitudContrasena: contrasena ? contrasena.length : 0
  };
}

/**
 * Borra la configuración guardada.
 */
function limpiarConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(PROP_CARPETA);
  props.deleteProperty(PROP_USUARIO);
  props.deleteProperty(PROP_CONTRASENA);
  return 'Configuración eliminada.';
}

/**
 * Lee y valida la configuración. Devuelve null si falta algo.
 */
function leerConfig_() {
  const props = PropertiesService.getScriptProperties();
  const carpetaId = props.getProperty(PROP_CARPETA);
  const usuario = props.getProperty(PROP_USUARIO);
  const contrasena = props.getProperty(PROP_CONTRASENA);

  if (!carpetaId || !usuario || !contrasena) return null;

  return { carpetaId: carpetaId, usuario: usuario, contrasena: contrasena };
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */

function validarCredenciales_(usuario, contrasena, config) {
  if (!usuario || !contrasena) return false;

  // Comparación en tiempo constante: evita filtrar información
  // por la diferencia de tiempo entre intentos.
  const usuarioOk = igualdadSegura_(String(usuario), config.usuario);
  const contrasenaOk = igualdadSegura_(String(contrasena), config.contrasena);

  return usuarioOk && contrasenaOk;
}

function igualdadSegura_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;

  let diferencia = a.length ^ b.length;
  const maximo = Math.max(a.length, b.length);

  for (let i = 0; i < maximo; i++) {
    diferencia |= a.charCodeAt(i % a.length) ^ b.charCodeAt(i % b.length);
  }

  return diferencia === 0;
}

/* ============================================================
   LISTADO DE MEDIOS
   ============================================================ */

function listarMedios_(carpetaId) {
  const resultado = {};
  const padre = DriveApp.getFolderById(carpetaId);
  const subcarpetas = padre.getFolders();

  while (subcarpetas.hasNext()) {
    const sub = subcarpetas.next();
    const categoria = sub.getName();
    const archivos = [];
    const iterador = sub.getFiles();

    while (iterador.hasNext()) {
      const archivo = iterador.next();
      const nombre = archivo.getName();

      if (!esMultimedia_(nombre)) continue;

      const id = archivo.getId();
      archivos.push({
        archivo: nombre,
        id: id,
        mimeType: archivo.getMimeType(),
        thumbnailUrl: 'https://drive.google.com/thumbnail?sz=w400&id=' + id
      });
    }

    archivos.sort(function (a, b) {
      return a.archivo.localeCompare(b.archivo, 'es', {
        numeric: true,
        sensitivity: 'base'
      });
    });

    if (archivos.length > 0) {
      resultado[categoria] = archivos;
    }
  }

  return resultado;
}

function esMultimedia_(nombre) {
  const punto = nombre.lastIndexOf('.');
  if (punto === -1) return false;

  const ext = nombre.substring(punto).toLowerCase();
  return EXT_IMAGEN.indexOf(ext) !== -1 || EXT_VIDEO.indexOf(ext) !== -1;
}

/* ============================================================
   RESPUESTA
   ============================================================ */

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
