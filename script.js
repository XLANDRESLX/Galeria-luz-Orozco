/* ============================================
   CONFIGURACIÓN DE LA GALERÍA
   ═══════════════════════════════════════════
   APPS_SCRIPT_URL: URL del web app de Google
   Apps Script (ver Code.gs).
   ============================================ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGANJHfJf9NgTYWV5wH1SI-xrWOXNpWQsAmpIBqCRJUWXsmotIUXI9IgG51fk6KZEUJw/exec';

async function cargarConfigAutenticado(user, pass) {
  try {
    const url = APPS_SCRIPT_URL + '?user=' + encodeURIComponent(user) + '&pass=' + encodeURIComponent(pass);
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.error) {
      return { error: data.error };
    }
    return data;
  } catch (e) {
    return { error: 'No se pudo conectar con el servidor.' };
  }
}

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
        let src, srcThumb;
        if (esDrive) {
          const base = "https://lh3.googleusercontent.com/d/" + driveId;
          if (tipo === 'imagen') {
            src = base;
            srcThumb = base + "=w500";
          } else {
            src = "https://drive.usercontent.google.com/download?id=" + driveId + "&export=open";
            srcThumb = thumbnailUrl;
          }
        } else {
          src = "recursos/" + categoria + "/" + nombreArchivo;
        }

        medios.push({ tipo, src, srcThumb, categoria, driveId, thumbnailUrl, mimeType });
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
        img.src = item.srcThumb || item.src;
        img.alt = item.src.substring(item.src.lastIndexOf('/') + 1);
        img.loading = 'lazy';
        img.decoding = 'async';

        img.addEventListener('load', function () {
          skeleton.classList.add('tarjeta__skeleton--oculto');
          setTimeout(function () { skeleton.remove(); }, 350);
        });

        img.addEventListener('error', function () {
          skeleton.classList.add('tarjeta__skeleton--oculto');
          setTimeout(function () { skeleton.remove(); }, 350);
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
        cerrarLightbox();
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
   INICIALIZACIÓN — LOGIN
   ══════════════════════════════════════════════════════════ */

function mostrarErrorLogin(msg) {
  var el = document.getElementById('loginError');
  if (el) el.textContent = msg;
}

function ocultarErrorLogin() {
  var el = document.getElementById('loginError');
  if (el) el.textContent = '';
}

function mostrarLogin() {
  var login = document.getElementById('login');
  var galeria = document.getElementById('galeria');
  if (login) login.style.display = 'flex';
  if (galeria) galeria.style.display = 'none';
}

function ocultarLogin() {
  var login = document.getElementById('login');
  var galeria = document.getElementById('galeria');
  if (login) login.style.display = 'none';
  if (galeria) galeria.style.display = 'block';
}

function iniciarGaleria(data) {
  mediosGlobal = autoEscanearMedios(data);
  ocultarLogin();
  renderizarGaleria(mediosGlobal);
  initAnimaciones();
  sessionStorage.setItem('galeria_data', JSON.stringify(data));
  var logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) logoutBtn.style.display = 'flex';
}

async function manejarLogin() {
  var userInput = document.getElementById('loginUser');
  var passInput = document.getElementById('loginPass');
  if (!userInput || !passInput) return;

  var user = userInput.value.trim();
  var pass = passInput.value.trim();
  if (!user || !pass) {
    mostrarErrorLogin('Ingrese usuario y contraseña');
    return;
  }

  ocultarErrorLogin();
  var btn = document.getElementById('loginBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
  }

  var data = await cargarConfigAutenticado(user, pass);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Ingresar';
  }

  if (data && data.error) {
    mostrarErrorLogin('Usuario o contraseña incorrectos');
    return;
  }

  if (data) {
    iniciarGaleria(data);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  var sessionData = sessionStorage.getItem('galeria_data');
  if (sessionData) {
    try {
      var parsed = JSON.parse(sessionData);
      iniciarGaleria(parsed);
    } catch (e) {
      sessionStorage.removeItem('galeria_data');
      mostrarLogin();
    }
  } else {
    mostrarLogin();
  }

  // Login: clic en botón
  var loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', manejarLogin);

  // Login: Enter en campos
  var loginUser = document.getElementById('loginUser');
  var loginPass = document.getElementById('loginPass');
  function loginKeydown(e) {
    if (e.key === 'Enter') manejarLogin();
  }
  if (loginUser) loginUser.addEventListener('keydown', loginKeydown);
  if (loginPass) loginPass.addEventListener('keydown', loginKeydown);
  if (loginUser) loginUser.focus();

  // Logout
  var logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem('galeria_data');
      location.reload();
    });
  }

  // Volver arriba
  var btnArriba = document.getElementById('btnArriba');
  if (btnArriba) {
    btnArriba.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        btnArriba.classList.add('btn-arriba--visible');
      } else {
        btnArriba.classList.remove('btn-arriba--visible');
      }
    });
  }

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
