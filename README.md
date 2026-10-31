# Galería Luz Elena Orozco

Galería multimedia web para las evidencias de la **Institución Educativa Isaac J. Pereira** — proyecto *Luz Elena Orozco PTA*.

Las fotos y videos se organizan por categorías dentro de una carpeta de Google Drive. Un backend en **Google Apps Script** lee esa carpeta y la publica como API JSON; el frontend es HTML, CSS y JavaScript puro, sin build ni dependencias.

---

## Características

- **Acceso con credenciales** antes de mostrar cualquier contenido.
- **Categorías automáticas**: cada subcarpeta de Drive se convierte en una sección.
- **Galería tipo mosaico** con carga diferida (*lazy loading*) y esqueleto de carga animado.
- **Visor (lightbox)** con navegación por teclado, flechas, gestos táctiles y cierre con `Esc`.
- **Presentación automática (slideshow)** con velocidad ajustable de 1 a 10 segundos.
- **Barra de navegación flotante** que se genera con las categorías reales, se puede arrastrar y se auto-centra en la sección visible.
- **Botón de volver arriba** que nunca queda tapado por la barra de navegación.
- **Diseño responsive** y respeto por `prefers-reduced-motion`.
- **Fondo animado**: orbes de luz, destellos titilantes, líneas en movimiento y halo que sigue al puntero.
- **Caché de 5 minutos** en el backend para no golpear la API de Drive en cada visita.

---

## Estructura del proyecto

```
Galeria-luz-Orozco/
├── index.html     Estructura de la página (header, login, galería, lightbox, nav)
├── style.css      Tema visual, animaciones y diseño responsive
├── script.js      Lógica del frontend (login, render, lightbox, efectos)
├── Code.gs        Backend de Google Apps Script (se despliega como Web app)
├── AGENTS.md      Convenciones técnicas del proyecto
└── README.md      Este archivo
```

---

## Requisitos

- Una cuenta de Google con acceso a la carpeta de Drive del proyecto.
- Un proyecto de **Google Apps Script** (gratuito, se crea desde el editor de Drive).
- Un navegador moderno para el frontend.

No hace falta Node.js, npm ni ningún proceso de compilación.

---

## Puesta en marcha

### 1. Preparar la carpeta de Drive

Dentro de la carpeta principal del proyecto, crea una subcarpeta por categoría, por ejemplo:

```
Galería Luz Elena Orozco/
├── Fotografías/
├── Videos/
├── Salidas Pedagógicas/
└── Actos Cívicos/
```

Los archivos deben tener una extensión soportada:

| Tipo   | Extensiones                                                  |
| ------ | ------------------------------------------------------------ |
| Imagen | `.jpg` `.jpeg` `.png` `.gif` `.webp` `.bmp` `.svg`            |
| Video  | `.mp4` `.webm` `.mov` `.avi` `.mkv`                           |

Para agregar otro formato, añade la extensión a `EXT_IMAGEN` o `EXT_VIDEO` en `Code.gs` **y** en `script.js`.

### 2. Crear el proyecto de Apps Script

1. Abre <https://script.google.com> y crea un **Nuevo proyecto**.
2. Reemplaza el contenido de `Código.gs` con el contenido de [`Code.gs`](./Code.gs).
3. Guarda el proyecto con un nombre reconocible, por ejemplo *Galeria Luz Elena Orozco*.

### 3. Configurar los datos privados

`Code.gs` **no contiene** el ID de la carpeta ni las credenciales. Todo se guarda en las **Propiedades del script**, que viven únicamente dentro del proyecto de Apps Script.

En el editor, selecciona la función `configurarGaleria`, edita el argumento y ejecútala una vez:

```javascript
configurarGaleria('ID_DE_LA_CARPETA', 'usuario', 'ContraseñaLargaYUnica')
```

- El **ID de la carpeta** es la parte final de su URL:
  `https://drive.google.com/drive/folders/`**`ESTE_ES_EL_ID`**
- La contraseña debe tener **al menos 10 caracteres** (la función lo valida).
- La primera vez Google pedirá autorizar los permisos de Drive.

Funciones auxiliares disponibles:

| Función                                        | Para qué sirve                                        |
| ---------------------------------------------- | ----------------------------------------------------- |
| `configurarGaleria(id, usuario, contrasena)`   | Configuración completa (carpeta + credenciales).       |
| `configurarCredenciales(usuario, contrasena)`  | Cambia solo las credenciales, sin tocar la carpeta.    |
| `verConfiguracion()`                           | Muestra qué está configurado, sin revelar la clave.    |
| `limpiarConfiguracion()`                       | Borra todo lo guardado.                                |

### 4. Desplegar como Web app

1. **Implementar ▸ Nueva implementación**.
2. Tipo: **Aplicación web**.
3. *Ejecutar como*: **Yo**.
4. *Quién tiene acceso*: **Cualquier usuario**.
5. Copia la URL que termina en `/exec`.

> Cada vez que edites `Code.gs` debes crear una **nueva versión** de la implementación
> (*Implementar ▸ Gestionar implementaciones ▸ Editar ▸ Versión: Nueva*). Ejecutar el
> editor no actualiza la URL pública.

### 5. Conectar el frontend

Pega la URL del paso anterior en `script.js`, línea 8:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/…/exec';
```

### 6. Abrir la galería

Abre `index.html` en el navegador (o publícalo con GitHub Pages, Netlify, etc.) e ingresa con las credenciales que configuraste.

---

## Seguridad

Este proyecto se diseñó para que el repositorio pueda ser público sin filtrar información:

- **El ID de la carpeta de Drive no está en el código.** Se guarda en las Propiedades del script.
- **No hay credenciales por defecto.** Si faltan las propiedades, el backend responde `Servidor no configurado` en lugar de aceptar un usuario genérico.
- **Comparación en tiempo constante** (`igualdadSegura_`) para usuario y contraseña, de modo que el tiempo de respuesta no delate información.
- **Errores genéricos** hacia el cliente (`Credenciales inválidas`, `Error del servidor`); el detalle va solo al registro de Apps Script.
- **`.gitignore`** bloquea `.env`, `.clasp.json`, claves y credenciales locales.

### Lo que sí es público (y es normal)

`APPS_SCRIPT_URL` está en `script.js` porque el navegador necesita llamarla. No es un secreto: la protección real son las credenciales. Aun así, ten en cuenta que:

- Las credenciales viajan como parámetros en la URL (`?user=…&pass=…`), por lo que quedan en el historial del navegador y en los registros del servidor. **No uses este esquema para datos de alta sensibilidad.**
- Usa siempre HTTPS (GitHub Pages y Apps Script ya lo hacen).
- Si alguna contraseña se compartió por error, cámbiala de inmediato con `configurarCredenciales(...)`. Cambiarla invalida el acceso anterior al instante.

> **Nota sobre el historial de Git:** si en el pasado se subieron valores reales, siguen presentes en los commits antiguos aunque el archivo actual esté limpio. En ese caso hay que reescribir el historial y rotar las credenciales.

---

## Cómo se usa

| Acción                          | Cómo                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| Iniciar sesión                  | Escribe usuario y contraseña, pulsa **Ingresar** o `Enter`. |
| Abrir una foto o video          | Clic sobre la tarjeta, o `Enter` / `Espacio` con foco.      |
| Cerrar el visor                 | `Esc`, la `×` o clic fuera del contenido.                   |
| Navegar en el visor             | Flechas `←` `→`, los botones laterales o deslizar el dedo.  |
| Iniciar/detener el slideshow    | Barra espaciadora o el botón `▶` del visor.                 |
| Ajustar la velocidad            | Deslizador **Vel.** (1 a 10 segundos, por defecto 4).       |
| Saltar a una categoría          | Botones de la barra flotante inferior.                      |
| Ir al inicio de la página       | Botón **★ Inicio** de la barra flotante.                    |
| Cerrar sesión                   | Botón **↪** en la esquina superior del encabezado.          |

---

## Paleta y diseño — regla 60-30-10

El tema sigue una proporción estricta de color:

| Proporción | Rol            | Colores                                             |
| ---------- | -------------- | --------------------------------------------------- |
| **60 %**   | Fondo          | Crema suave `#FFFDF5` y blanco `#FFFFFF`            |
| **30 %**   | Estructura     | Verde manzana `#7CB342` y azul cielo `#5DADE2`      |
| **10 %**   | Acento         | Ámbar `#FFB300` / `#FF8F00`                         |

El ámbar se reserva para acciones importantes: **Ingresar**, volver arriba, categoría activa del nav, slideshow activo, la insignia de video y la estrella del encabezado. No se usa como decoración.

Tipografía: **Inter** para la interfaz y **Playfair Display** para el nombre de la exposición en el encabezado.

---

## Rendimiento

- El backend cachea la respuesta **300 segundos** (clave `galeria_<folderId>`). Añade `?refresh=1` a la petición para forzar datos frescos.
- Las imágenes usan `loading="lazy"` y miniaturas de 400 px.
- Las animaciones de barrido usan `transform` en vez de `left`, evitando recalcular el layout en cada fotograma.
- El aro degradado de las tarjetas solo se anima al pasar el cursor, no en las cientos de tarjetas a la vez.
- El modo *reducir movimiento* del sistema desactiva los desplazamientos grandes y conserva solo los brillos suaves.

---

## Solución de problemas

| Síntoma                                         | Causa probable / solución                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| «Usuario o contraseña incorrectos»              | No ejecutaste `configurarGaleria(...)`, o cambiaste las credenciales y no redesplegaste.  |
| «Servidor no configurado»                       | Faltan las Propiedades del script. Ejecuta `configurarGaleria(...)` y revisa `verConfiguracion()`. |
| La galería aparece vacía                        | La carpeta no tiene subcarpetas con archivos de extensión soportada.                      |
| Cambios en `Code.gs` que no se reflejan         | Falta crear una **nueva versión** de la implementación.                                   |
| Cambios en CSS/JS que no se ven                 | Recarga forzada con `Ctrl + F5` para saltar la caché.                                     |
| No se ven las animaciones grandes               | El sistema tiene activado *reducir movimiento*. En Windows: Configuración ▸ Accesibilidad ▸ Efectos visuales ▸ Efectos de animación. |
| Sigue mostrando contenido antiguo               | Añade `?refresh=1` o espera a que expiren los 300 s de caché.                             |

---

## Licencia y uso

Proyecto interno de la **Institución Educativa Isaac J. Pereira** para el proyecto *Luz Elena Orozco PTA*. Las fotografías y videos son propiedad de la institución y de sus autores; no se distribuyen con el código.

El código se comparte como referencia educativa.
