/* ============================================================
   GALERÍA LUZ ELENA OROZCO — BACKEND (Google Apps Script)
   ------------------------------------------------------------
   Carpeta de Drive: una subcarpeta por categoría.
   Endpoint: doGet(?user=...&pass=...)

   Credenciales: se leen de las Propiedades del script.
   Configúralas UNA vez ejecutando desde el editor:

     configurarCredenciales('luzelena', 'TU_CONTRASENA')

   Si prefieres hardcodearlas, escribe los valores en
   USUARIO_POR_DEFECTO y CONTRASENA_POR_DEFECTO.
   ============================================================ */

const FOLDER_ID = '1V5VbwXVJqkdzhljFdRuy4f5WXDp0cf4Y';

const USUARIO_POR_DEFECTO = 'invitado';
const CONTRASENA_POR_DEFECTO = '123456';

const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const EXT_VIDEO = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

const CACHE_SEGUNDOS = 300;

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};

    if (!validarCredenciales_(params.user, params.pass)) {
      return json_({ error: 'Credenciales inválidas' });
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = 'galeria_' + FOLDER_ID;

    if (params.refresh !== '1') {
      const cacheado = cache.get(cacheKey);
      if (cacheado) {
        return json_(JSON.parse(cacheado));
      }
    }

    const resultado = listarMedios_();

    try {
      cache.put(cacheKey, JSON.stringify(resultado), CACHE_SEGUNDOS);
    } catch (ignorado) {}

    return json_(resultado);
  } catch (err) {
    return json_({ error: 'Error del servidor: ' + err.message });
  }
}

function validarCredenciales_(usuario, contrasena) {
  if (!usuario || !contrasena) return false;

  const props = PropertiesService.getScriptProperties();
  const usuarioValido = props.getProperty('USUARIO') || USUARIO_POR_DEFECTO;
  const contrasenaValida = props.getProperty('CONTRASENA') || CONTRASENA_POR_DEFECTO;

  if (!usuarioValido || !contrasenaValida) return false;

  return usuario === usuarioValido && contrasena === contrasenaValida;
}

function listarMedios_() {
  const resultado = {};
  const padre = DriveApp.getFolderById(FOLDER_ID);
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

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function configurarCredenciales(usuario, contrasena) {
  if (!usuario || !contrasena) {
    throw new Error('Uso: configurarCredenciales("usuario", "contraseña")');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty('USUARIO', usuario);
  props.setProperty('CONTRASENA', contrasena);

  return 'Credenciales configuradas correctamente.';
}
