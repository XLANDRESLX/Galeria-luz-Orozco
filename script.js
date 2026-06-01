/* ============================================
   CONFIGURACIÓN DE LA GALERÍA
   ═══════════════════════════════════════════
   Para añadir archivos nuevos, solo agrega
   el nombre del archivo dentro del array de
   su categoría correspondiente. La función
   autoEscanearMedios() detectará si es imagen
   o video según la extensión.

   APPS_SCRIPT_URL: pega aquí la URL del web
   app de Google Apps Script (ver Code.gs).
   Si está vacío, usa los datos locales.
   ============================================ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMVW4H2bIjSomt7T4fsQPPVi6li4jrc862ZXxoVLXEl7JEiCweINPnRs-KJ2CNiK1mtA/exec';

async function cargarConfigDesdeDrive() {
  if (!APPS_SCRIPT_URL) return null;
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('Apps Script no disponible, usando datos locales.');
    return null;
  }
}

const MEDIOS_POR_CATEGORIA = {
  "CENTRO DE INTERES DE MICRO FÚTBOL KID": [
    "WhatsApp Image 2026-05-24 at 4.04.12 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 4.04.13 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.04.13 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 4.04.14 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.04.14 PM (2).jpeg",
    "WhatsApp Image 2026-05-24 at 4.04.14 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 4.07.36 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.07.36 PM (2).jpeg",
    "WhatsApp Image 2026-05-24 at 4.07.36 PM.jpeg",
    "WhatsApp Video 2026-05-24 at 4.07.40 PM.mp4"
  ],

  "Centro de interés manos crestivas": [
    "WhatsApp Image 2026-05-24 at 5.01.54 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.02.38 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.04.49 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.05.20 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.05.59 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.14.10 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 5.14.10 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.14.11 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.16.56 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 5.20.01 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 5.20.01 PM (2).jpeg",
    "WhatsApp Image 2026-05-24 at 5.20.01 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 6.28.21 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 6.28.21 PM.jpeg",
    "WhatsApp Video 2026-05-24 at 5.16.57 PM.mp4"
  ],

  "Cuerpo y expresión": [
    "WhatsApp Image 2026-05-24 at 4.42.48 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 4.42.49 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.42.49 PM.jpeg",
    "WhatsApp Image 2026-05-24 at 4.42.49 PM(1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.45.54 PM (1).jpeg",
    "WhatsApp Image 2026-05-24 at 4.45.54 PM (2).jpeg",
    "WhatsApp Image 2026-05-24 at 4.45.54 PM (3).jpeg",
    "WhatsApp Image 2026-05-24 at 4.45.54 PM.jpeg",
    "WhatsApp Video 2026-05-24 at 4.18.59 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.39.59 PM.mp4"
  ],

  "DANZA": [
    "WhatsApp Video 2026-05-24 at 4.09.20 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.09.46 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.10.16 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.11.50 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.12.27 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.13.17 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.15.37 PM.mp4",
    "WhatsApp Video 2026-05-24 at 4.18.10 PM.mp4"
  ],

  "Justamente": [
    "WhatsApp Image 2026-05-24 at 6.45.44 PM.jpeg",
    "WhatsApp Image 2026-05-25 at 9.15.18 PM.jpeg",
    "WhatsApp Image 2026-05-25 at 9.15.19 PM (1).jpeg",
    "WhatsApp Image 2026-05-25 at 9.15.19 PM.jpeg"
  ],

  "Leo": [
    "WhatsApp Image 2026-05-26 at 2.20.12 PM.jpeg"
  ]
};

/* ══════════════════════════════════════════════════════════
   AUTO ESCANEAR MEDIOS
   ══════════════════════════════════════════════════════════
   Convierte MEDIOS_POR_CATEGORIA en un array de objetos
   { tipo, src, categoria } y filtra automáticamente
   archivos no multimedia (como .zip).

   Para agregar un nuevo tipo de archivo soportado, agrega
   su extensión a EXT_IMAGEN o EXT_VIDEO abajo.
   ══════════════════════════════════════════════════════════ */

const EXT_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const EXT_VIDEO = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

function autoEscanearMedios(config) {
  const medios = [];
  const entries = Object.entries(config);

  for (const [categoria, archivos] of entries) {
    for (const entrada of archivos) {
      const esDrive = typeof entrada === 'object' && entrada.id;
      const nombreArchivo = esDrive ? entrada.archivo : entrada;
      const driveId = esDrive ? entrada.id : null;
      const mimeType = esDrive ? entrada.mimeType : null;
      const thumbnailUrl = esDrive
        ? (entrada.thumbnailUrl || "https://drive.google.com/thumbnail?sz=w400&id=" + driveId)
        : null;

      const ext = nombreArchivo.substring(nombreArchivo.lastIndexOf('.')).toLowerCase();
      let tipo = null;

      if (EXT_IMAGEN.includes(ext)) tipo = 'imagen';
      else if (EXT_VIDEO.includes(ext)) tipo = 'video';

      if (tipo) {
        let src;
        if (esDrive) {
          if (tipo === 'imagen') {
            src = "https://lh3.googleusercontent.com/d/" + driveId;
          } else {
            src = "https://drive.usercontent.google.com/download?id=" + driveId + "&export=open";
          }
        } else {
          src = "recursos/" + categoria + "/" + nombreArchivo;
        }

        medios.push({ tipo, src, categoria, driveId, thumbnailUrl, mimeType });
      }
    }
  }

  return medios;
}

/* ── Estado global del lightbox ── */
let mediosGlobal = [];
let indiceActual = -1;
let slideshowTimer = null;
let slideshowActivo = false;
let slideshowIntervalo = 4000;
let tarjetaFocoPrevio = null;
let touchStartX = 0;
let touchStartY = 0;

/* ══════════════════════════════════════════════════════════
   RENDERIZAR GALERÍA
   ══════════════════════════════════════════════════════════ */

function renderizarGaleria(medios) {
  const contenedor = document.getElementById('galeria');
  if (!contenedor) return;

  const grupos = {};
  for (const item of medios) {
    if (!grupos[item.categoria]) grupos[item.categoria] = [];
    grupos[item.categoria].push(item);
  }

  for (const [categoria, items] of Object.entries(grupos)) {
    const seccion = document.createElement('section');
    seccion.className = 'seccion';

    const titulo = document.createElement('h2');
    titulo.className = 'seccion__titulo';
    titulo.textContent = categoria;

    const grid = document.createElement('div');
    grid.className = 'seccion__grid';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const tarjeta = document.createElement('div');
      tarjeta.className = 'tarjeta';
      tarjeta.setAttribute('role', 'button');
      tarjeta.setAttribute('tabindex', '0');
      tarjeta.dataset.index = i;

      if (item.tipo === 'imagen') {
        // Skeleton shimmer mientras carga
        const skeleton = document.createElement('div');
        skeleton.className = 'tarjeta__skeleton';

        const img = document.createElement('img');
        img.className = 'tarjeta__img';
        img.src = item.src;
        img.alt = item.src.substring(item.src.lastIndexOf('/') + 1);
        img.loading = 'lazy';
        img.decoding = 'async';

        img.addEventListener('load', function () {
          skeleton.remove();
        });

        img.addEventListener('error', function () {
          skeleton.remove();
          this.style.display = 'none';
          const errorEl = document.createElement('div');
          errorEl.className = 'tarjeta__error';
          errorEl.textContent = 'Error';
          tarjeta.appendChild(errorEl);
        });

        tarjeta.appendChild(skeleton);
        tarjeta.appendChild(img);
      } else {
        const poster = document.createElement('div');
        poster.className = 'tarjeta__img tarjeta__img--video';
        if (item.thumbnailUrl) {
          poster.style.backgroundImage = 'url(' + item.thumbnailUrl + ')';
          poster.style.backgroundSize = 'cover';
          poster.style.backgroundPosition = 'center';
        }
        poster.style.backgroundColor = '#1a1a2e';

        const overlay = document.createElement('div');
        overlay.className = 'tarjeta__video-overlay';

        const icono = document.createElement('span');
        icono.className = 'tarjeta__video-icono';
        icono.textContent = '\u25B6';

        overlay.appendChild(icono);
        tarjeta.appendChild(poster);
        tarjeta.appendChild(overlay);
      }

      const nombre = document.createElement('span');
      nombre.className = 'tarjeta__nombre';
      nombre.textContent = item.src.substring(item.src.lastIndexOf('/') + 1);
      tarjeta.appendChild(nombre);

      tarjeta.addEventListener('click', function () {
        const idx = medios.indexOf(item);
        abrirLightbox(item, idx);
      });
      tarjeta.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const idx = medios.indexOf(item);
          abrirLightbox(item, idx);
        }
      });

      grid.appendChild(tarjeta);
    }

    seccion.appendChild(titulo);
    seccion.appendChild(grid);
    contenedor.appendChild(seccion);
  }
}

/* ══════════════════════════════════════════════════════════
   LIGHTBOX
   ══════════════════════════════════════════════════════════ */

function abrirLightbox(item, indice) {
  try {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    tarjetaFocoPrevio = document.activeElement;
    indiceActual = indice;
    renderizarMediaEnLightbox(indiceActual);
    lightbox.classList.add('lightbox--abierto');
    document.body.style.overflow = 'hidden';
    actualizarBotonesNav();
    detenerSlideshow();

    setTimeout(function () {
      const btnCerrar = document.getElementById('btnCerrarLightbox');
      if (btnCerrar) btnCerrar.focus();
    }, 150);
  } catch (e) { /* ignore */ }
}

function renderizarMediaEnLightbox(indice) {
  try {
    const contenedor = document.getElementById('contenidoLightbox');
    if (!contenedor) return;

    const item = mediosGlobal[indice];
    if (!item) return;

    contenedor.innerHTML = '';

    if (item.tipo === 'imagen') {
      const img = document.createElement('img');
      img.className = 'lightbox__img';
      img.src = item.src;
      img.alt = item.src.substring(item.src.lastIndexOf('/') + 1);
      img.decoding = 'async';

      img.addEventListener('click', function () {
        this.classList.toggle('lightbox__img--zoomado');
      });

      contenedor.appendChild(img);

      [-1, 1].forEach(function (dir) {
        const idx = indice + dir;
        if (idx >= 0 && idx < mediosGlobal.length && mediosGlobal[idx].tipo === 'imagen') {
          const preload = new Image();
          preload.src = mediosGlobal[idx].src;
        }
      });
    } else if (item.driveId) {
      const iframe = document.createElement('iframe');
      iframe.className = 'lightbox__video';
      iframe.src = "https://drive.google.com/file/d/" + item.driveId + "/preview";
      iframe.allow = "autoplay";
      iframe.allowFullscreen = true;
      contenedor.appendChild(iframe);
    } else {
      const video = document.createElement('video');
      video.className = 'lightbox__video';
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsinline = true;
      video.preload = 'auto';
      if (item.thumbnailUrl) video.poster = item.thumbnailUrl;
      video.src = item.src;
      if (item.mimeType) video.type = item.mimeType;
      contenedor.appendChild(video);
      video.play().catch(function () {});
    }

    const contador = document.getElementById('lightboxContador');
    if (contador) {
      contador.textContent = (indice + 1) + ' / ' + mediosGlobal.length;
    }
  } catch (e) { /* ignore */ }
}

function navegarLightbox(dir) {
  try {
    const nuevoIndice = indiceActual + dir;
    if (nuevoIndice < 0 || nuevoIndice >= mediosGlobal.length) return;

    const contenedor = document.getElementById('contenidoLightbox');
    if (!contenedor) return;

    const video = contenedor.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.innerHTML = '';
      video.load();
    }

    contenedor.style.opacity = '0';
    contenedor.style.transform = 'scale(0.95)';

    setTimeout(function () {
      indiceActual = nuevoIndice;
      renderizarMediaEnLightbox(indiceActual);
      contenedor.style.opacity = '';
      contenedor.style.transform = '';
      actualizarBotonesNav();
    }, 180);
  } catch (e) { /* ignore */ }
}

function cerrarLightbox() {
  const lightbox = document.getElementById('lightbox');
  const contenedor = document.getElementById('contenidoLightbox');
  if (!lightbox || !contenedor) return;

  detenerSlideshow();
  lightbox.classList.remove('lightbox--abierto');
  document.body.style.overflow = '';

  const video = contenedor.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.innerHTML = '';
    video.load();
  }

  setTimeout(function () {
    contenedor.innerHTML = '';
  }, 500);

  // Restaurar foco
  if (tarjetaFocoPrevio && tarjetaFocoPrevio.focus) {
    tarjetaFocoPrevio.focus();
    tarjetaFocoPrevio = null;
  }
}

function actualizarBotonesNav() {
  const btnPrev = document.getElementById('btnPrevLightbox');
  const btnNext = document.getElementById('btnNextLightbox');
  if (btnPrev) btnPrev.disabled = indiceActual <= 0;
  if (btnNext) btnNext.disabled = indiceActual >= mediosGlobal.length - 1;
}

/* ══════════════════════════════════════════════════════════
   SLIDESHOW
   ══════════════════════════════════════════════════════════ */

function toggleSlideshow() {
  if (slideshowActivo) {
    detenerSlideshow();
  } else {
    iniciarSlideshow();
  }
}

function iniciarSlideshow() {
  if (indiceActual >= mediosGlobal.length - 1) return;
  slideshowActivo = true;

  const btn = document.getElementById('btnSlideshowLightbox');
  if (btn) {
    btn.textContent = '\u23F8';
    btn.classList.add('activo');
    btn.setAttribute('aria-label', 'Pausar slideshow');
  }

  slideshowTimer = setInterval(function () {
    if (indiceActual < mediosGlobal.length - 1) {
      navegarLightbox(1);
    } else {
      detenerSlideshow();
    }
  }, slideshowIntervalo);
}

function detenerSlideshow() {
  slideshowActivo = false;
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }

  const btn = document.getElementById('btnSlideshowLightbox');
  if (btn) {
    btn.textContent = '\u25B6';
    btn.classList.remove('activo');
    btn.setAttribute('aria-label', 'Slideshow');
  }
}

/* ══════════════════════════════════════════════════════════
   INTERSECTION OBSERVER — Animaciones de entrada
   ══════════════════════════════════════════════════════════
   Las tarjetas aparecen con fadeInUp a medida que
   haces scroll. Cada tarjeta tiene un pequeño retraso
   escalonado para un efecto de cascada.

   Para cambiar la velocidad: edita --duracion-fade
   y --cubic-bezier en style.css.
   ══════════════════════════════════════════════════════════ */

function initAnimaciones() {
  requestAnimationFrame(function () {
    const tarjetas = document.querySelectorAll('.tarjeta');

    const observer = new IntersectionObserver(function (entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const index = Array.from(tarjetas).indexOf(entry.target);
          const retraso = index * 80;
          setTimeout(function () {
            entry.target.classList.add('tarjeta--visible');
          }, retraso);
          observer.unobserve(entry.target);
        }
      }
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    for (const tarjeta of tarjetas) {
      observer.observe(tarjeta);
    }
  });
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN
   ══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async function () {
  const configDrive = await cargarConfigDesdeDrive();
  const configFinal = configDrive || MEDIOS_POR_CATEGORIA;
  mediosGlobal = autoEscanearMedios(configFinal);
  renderizarGaleria(mediosGlobal);
  initAnimaciones();

  // Lightbox: cerrar
  const btnCerrar = document.getElementById('btnCerrarLightbox');
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarLightbox);

  // Lightbox: cerrar al hacer clic fuera del contenido
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) cerrarLightbox();
    });
  }

  // Navegación (detiene slideshow si está activo)
  const btnPrev = document.getElementById('btnPrevLightbox');
  const btnNext = document.getElementById('btnNextLightbox');
  if (btnPrev) btnPrev.addEventListener('click', function () { detenerSlideshow(); navegarLightbox(-1); });
  if (btnNext) btnNext.addEventListener('click', function () { detenerSlideshow(); navegarLightbox(1); });

  // Slideshow
  const btnSlideshow = document.getElementById('btnSlideshowLightbox');
  if (btnSlideshow) btnSlideshow.addEventListener('click', toggleSlideshow);

  // Control de velocidad
  const rangoVelocidad = document.getElementById('rangoVelocidad');
  const velocidadValor = document.getElementById('velocidadValor');
  if (rangoVelocidad && velocidadValor) {
    rangoVelocidad.addEventListener('input', function () {
      slideshowIntervalo = this.value * 1000;
      velocidadValor.textContent = this.value + 's';
      if (slideshowActivo) {
        detenerSlideshow();
        iniciarSlideshow();
      }
    });
  }

  // Teclado
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') cerrarLightbox();
    if (e.key === 'ArrowLeft') { detenerSlideshow(); navegarLightbox(-1); }
    if (e.key === 'ArrowRight') { detenerSlideshow(); navegarLightbox(1); }
  });

  // Focus trap dentro del lightbox
  if (lightbox) {
    lightbox.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      if (!lightbox.classList.contains('lightbox--abierto')) return;

      const focusable = lightbox.querySelectorAll(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Swipe gestures en lightbox
  if (lightbox) {
    lightbox.addEventListener('touchstart', function (e) {
      if (!lightbox.classList.contains('lightbox--abierto')) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
      if (!lightbox.classList.contains('lightbox--abierto')) return;
      const deltaX = e.changedTouches[0].screenX - touchStartX;
      const deltaY = e.changedTouches[0].screenY - touchStartY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
        detenerSlideshow();
        if (deltaX > 0) {
          navegarLightbox(-1);
        } else {
          navegarLightbox(1);
        }
      }
    }, { passive: true });
  }
});
