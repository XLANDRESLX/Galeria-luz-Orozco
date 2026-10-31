/* ============================================
   CONFIGURACIÓN DE LA GALERÍA
   ═══════════════════════════════════════════
   APPS_SCRIPT_URL: URL del web app de Google
   Apps Script (ver Code.gs).
   ============================================ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxC6yQk6AXK9PcSMfw4hcpgE9-1-blADgsieJoUOXzjWPQmioOHuP8lcHA2IA_iugnG/exec';

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
    seccion.id = 'seccion-' + slugCategoria(categoria);
    seccion.dataset.categoria = categoria;

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
      tarjeta.dataset.categoria = categoria;

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
        poster.style.backgroundColor = '#E8F0DC';

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

      // Luz que sigue al cursor dentro de la tarjeta (ver style.css)
      const spot = document.createElement('span');
      spot.className = 'tarjeta__spot';
      spot.setAttribute('aria-hidden', 'true');
      tarjeta.appendChild(spot);

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

  construirNavFlotante(Object.keys(grupos));
}

/* Convierte el nombre de una categoría en un id válido */
function slugCategoria(nombre) {
  return String(nombre)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';
}

/* Construye los botones de la barra flotante a partir de las categorías reales */
function construirNavFlotante(categorias) {
  const nav = document.querySelector('.float-nav');
  if (!nav) return;

  nav.innerHTML = '';

  const btnInicio = document.createElement('button');
  btnInicio.className = 'float-nav__btn';
  btnInicio.type = 'button';
  btnInicio.dataset.target = 'top';
  btnInicio.textContent = '\u2605 Inicio';
  nav.appendChild(btnInicio);

  categorias.forEach(function (categoria) {
    const btn = document.createElement('button');
    btn.className = 'float-nav__btn';
    btn.type = 'button';
    btn.dataset.target = 'seccion-' + slugCategoria(categoria);
    btn.textContent = categoria;
    nav.appendChild(btn);
  });

  conectarNavFlotante();
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
  const tarjetas = document.querySelectorAll('.tarjeta');
  if (!tarjetas.length) return;

  const observer = new IntersectionObserver(function (entries) {
    // Se animan solo las que entran en este lote, con un escalonado corto
    const visibles = entries.filter(function (e) { return e.isIntersecting; });

    visibles.forEach(function (entry, i) {
      entry.target.style.setProperty('--retardo', (i % 8) * 35 + 'ms');
      entry.target.classList.add('tarjeta--visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0,
    rootMargin: '150px 0px 0px 0px'
  });

  // Observar todas de inmediato: el observer no bloquea el scroll
  tarjetas.forEach(function (tarjeta) {
    observer.observe(tarjeta);
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

/* ── Barra de navegación flotante ── */

function conectarNavFlotante() {
  const botones = document.querySelectorAll('.float-nav__btn');

  botones.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const esInicio = btn.dataset.target === 'top';
      const destino = esInicio ? null : document.getElementById(btn.dataset.target);
      if (!esInicio && !destino) return;

      botones.forEach(function (b) { b.classList.remove('activo'); });
      btn.classList.add('activo');
      ultimaCategoriaActiva = btn.dataset.target;
      // Al elegir una categoría se vuelve al centrado automático
      navScrollManualHasta = 0;
      centrarBotonActivo(btn);

      if (esInicio) {
        // "Inicio" lleva arriba del todo: el encabezado Isaac J. Pereira
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  activarScrollNav();
  actualizarAltoNav();
  actualizarEstadoFlotante();
}

/* Permite desplazar la barra a mano: rueda del mouse, arrastre y swipe.
   Mientras el usuario la mueve, el auto-centrado se pausa unos segundos. */
let navScrollManualHasta = 0;

function activarScrollNav() {
  const nav = document.querySelector('.float-nav');
  if (!nav || nav.dataset.scrollListo === '1') return;
  nav.dataset.scrollListo = '1';

  function marcarManual() {
    navScrollManualHasta = Date.now() + 3000;
  }

  // Rueda del mouse: la vertical se convierte en desplazamiento horizontal
  nav.addEventListener('wheel', function (e) {
    if (nav.scrollWidth <= nav.clientWidth + 2) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;

    const antes = nav.scrollLeft;
    nav.scrollLeft = antes + delta;

    if (nav.scrollLeft !== antes) {
      e.preventDefault();
      marcarManual();
    }
  }, { passive: false });

  // Arrastre con el mouse (el táctil ya se desplaza de forma nativa)
  let arrastrando = false;
  let arrastreMovido = false;
  let xInicial = 0;
  let scrollInicial = 0;

  nav.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    arrastrando = true;
    arrastreMovido = false;
    xInicial = e.clientX;
    scrollInicial = nav.scrollLeft;
  });

  nav.addEventListener('pointermove', function (e) {
    if (!arrastrando) return;

    const dx = e.clientX - xInicial;
    if (Math.abs(dx) > 5) arrastreMovido = true;
    if (!arrastreMovido) return;

    nav.scrollLeft = scrollInicial - dx;
    nav.classList.add('float-nav--arrastrando');
    marcarManual();
  });

  function terminarArrastre() {
    if (!arrastrando) return;
    arrastrando = false;
    nav.classList.remove('float-nav--arrastrando');
  }

  nav.addEventListener('pointerup', terminarArrastre);
  nav.addEventListener('pointerleave', terminarArrastre);
  window.addEventListener('pointerup', terminarArrastre);

  // Si fue un arrastre, no se dispara el clic del botón
  nav.addEventListener('click', function (e) {
    if (arrastreMovido) {
      e.preventDefault();
      e.stopPropagation();
      arrastreMovido = false;
    }
  }, true);

  // Swipe táctil: también pausa el auto-centrado
  nav.addEventListener('touchstart', marcarManual, { passive: true });
  nav.addEventListener('touchmove', marcarManual, { passive: true });
}

/* Publica la altura real de la barra para que otros elementos
   (botón "volver arriba") se coloquen por encima de ella */
function actualizarAltoNav() {
  const nav = document.querySelector('.float-nav');
  if (!nav) return;

  const alto = getComputedStyle(nav).display === 'none' ? 0 : nav.offsetHeight;
  document.documentElement.style.setProperty('--alto-nav', alto + 'px');
}

/* Desliza la barra flotante para que el botón activo quede visible */
function centrarBotonActivo(btn) {
  const nav = btn.closest('.float-nav');
  if (!nav) return;

  // Si todos los botones caben, no hay nada que deslizar
  if (nav.scrollWidth <= nav.clientWidth + 2) return;

  const navRect = nav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();

  const destino = nav.scrollLeft
    + (btnRect.left - navRect.left)
    - (navRect.width - btnRect.width) / 2;

  const maximo = nav.scrollWidth - nav.clientWidth;

  nav.scrollTo({
    left: Math.max(0, Math.min(destino, maximo)),
    behavior: 'smooth'
  });
}

let ultimaCategoriaActiva = null;

/* Resalta el botón de la sección que se está viendo */
function actualizarEstadoFlotante() {
  const botones = document.querySelectorAll('.float-nav__btn');
  if (!botones.length) return;

  const secciones = document.querySelectorAll('.seccion');
  const limite = 140; // px desde arriba donde se considera "sección activa"
  let activo = 'top';

  secciones.forEach(function (seccion) {
    if (seccion.getBoundingClientRect().top <= limite) {
      activo = seccion.id;
    }
  });

  let botonActivo = null;

  botones.forEach(function (btn) {
    const esActivo = btn.dataset.target === activo;
    btn.classList.toggle('activo', esActivo);
    if (esActivo) botonActivo = btn;
  });

  // Solo desplazamos la barra cuando cambia la categoría y el usuario no
  // la está moviendo a mano.
  if (botonActivo && activo !== ultimaCategoriaActiva) {
    ultimaCategoriaActiva = activo;
    if (Date.now() > navScrollManualHasta) {
      centrarBotonActivo(botonActivo);
    }
  }
}

window.addEventListener('scroll', actualizarEstadoFlotante, { passive: true });
window.addEventListener('resize', actualizarAltoNav);

document.addEventListener('DOMContentLoaded', function () {
  conectarNavFlotante();
  crearDestellosFondo();
  activarLuzPuntero();
  activarEfectoTarjetas();
  actualizarProgresoScroll();

  window.addEventListener('scroll', actualizarProgresoScroll, { passive: true });
  window.addEventListener('resize', actualizarProgresoScroll);
});

// La barra puede cambiar de alto al cargar las fuentes
window.addEventListener('load', actualizarAltoNav);

/* ══════════════════════════════════════════════════════════
   EFECTOS DINÁMICOS
   ══════════════════════════════════════════════════════════ */

/* Crea los destellos que titilan en el fondo.
   Verde y azul son estructura (30%); el ámbar aparece poco (regla 10%). */
function crearDestellosFondo() {
  const cont = document.getElementById('bgDestellos');
  if (!cont || cont.childElementCount) return;

  const TOTAL = 36;
  const tonos = [
    'rgba(124, 179, 66, 0.95)',
    'rgba(124, 179, 66, 0.95)',
    'rgba(93, 173, 226, 0.95)',
    'rgba(93, 173, 226, 0.95)',
    'rgba(174, 213, 129, 1)',
    'rgba(174, 213, 129, 1)',
    'rgba(124, 179, 66, 0.95)',
    'rgba(93, 173, 226, 0.95)',
    'rgba(255, 179, 0, 0.95)'
  ];

  for (let i = 0; i < TOTAL; i++) {
    const destello = document.createElement('span');
    destello.className = 'destello';
    destello.style.setProperty('--x', (Math.random() * 100).toFixed(2) + '%');
    destello.style.setProperty('--y', (Math.random() * 100).toFixed(2) + '%');
    destello.style.setProperty('--s', (2 + Math.random() * 4).toFixed(2) + 'px');
    destello.style.setProperty('--dur', (3.5 + Math.random() * 5).toFixed(2) + 's');
    destello.style.setProperty('--delay', (Math.random() * 6).toFixed(2) + 's');
    destello.style.setProperty('--tono', tonos[i % tonos.length]);
    cont.appendChild(destello);
  }
}

/* Halo de luz que sigue al puntero (solo con ratón/trackpad) */
function activarLuzPuntero() {
  if (window.matchMedia('(hover: none)').matches) return;

  let pendiente = false;
  let x = 0;
  let y = 0;

  function aplicar() {
    pendiente = false;
    const raiz = document.documentElement.style;
    raiz.setProperty('--mx', x + 'px');
    raiz.setProperty('--my', y + 'px');
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    document.body.classList.add('con-puntero');
    x = e.clientX;
    y = e.clientY;
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
  }, { passive: true });
}

/* Inclinación 3D + luz local en cada tarjeta */
function activarEfectoTarjetas() {
  if (window.matchMedia('(hover: none)').matches) return;

  let tarjetaActiva = null;
  let ultimoEvento = null;
  let pendiente = false;

  function limpiar(tarjeta) {
    tarjeta.style.removeProperty('--tiltX');
    tarjeta.style.removeProperty('--tiltY');
    tarjeta.style.removeProperty('--cx');
    tarjeta.style.removeProperty('--cy');
  }

  function aplicar() {
    pendiente = false;
    const e = ultimoEvento;
    if (!e) return;

    const tarjeta = e.target.closest ? e.target.closest('.tarjeta') : null;

    if (tarjeta !== tarjetaActiva) {
      if (tarjetaActiva) limpiar(tarjetaActiva);
      tarjetaActiva = tarjeta;
    }

    if (!tarjeta) return;

    const r = tarjeta.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;

    tarjeta.style.setProperty('--cx', (px * 100).toFixed(1) + '%');
    tarjeta.style.setProperty('--cy', (py * 100).toFixed(1) + '%');
    tarjeta.style.setProperty('--tiltX', ((0.5 - py) * 9).toFixed(2) + 'deg');
    tarjeta.style.setProperty('--tiltY', ((px - 0.5) * 9).toFixed(2) + 'deg');
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    ultimoEvento = e;
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
  }, { passive: true });
}

/* Barra de progreso de lectura en la parte superior */
function actualizarProgresoScroll() {
  const barra = document.getElementById('scrollProgresoBarra');
  if (!barra) return;

  const recorrido = document.documentElement.scrollHeight - window.innerHeight;
  const pct = recorrido > 0 ? (window.scrollY / recorrido) * 100 : 0;
  barra.style.width = Math.min(100, Math.max(0, pct)).toFixed(2) + '%';
}
