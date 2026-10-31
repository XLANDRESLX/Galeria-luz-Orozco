# Galeria-luz-Orozco

This is a multimedia gallery web app for the "Luz Elena Orozco" exhibition. It has a Google Apps Script backend and a JavaScript/HTML frontend.

## Project structure

- `Code.gs` — Google Apps Script backend. Deploy as a **Web app** (Publish ▸ Web app). The URL becomes the API endpoint.
- `script.js` — Frontend logic: login, fetch data, render gallery + lightbox, slideshow, keyboard/swipe navigation, animations.
- `style.css` — Styling with CSS variables, animations, responsive design (flex/column grid).
- `index.html` — Page skeleton; loads `script.js` and `style.css`.
- `README.md` — Short project description.

## Authentication

- **Default credentials**: user=`invitado`, pass=`123456`. These are hardcoded in `Code.gs` as `USUARIO_POR_DEFECTO` and `CONTRASENA_POR_DEFECTO`.
- **To set custom credentials**: open `Code.gs` in the Google Apps Script editor and run `configurarCredenciales('luzelena', 'TU_CONTRASENA')`. This stores the values in script properties so `validarCredenciales_` will use them instead of the defaults.
- Credentials are checked via the `user` and `pass` query params on the web app URL (`?user=...&pass=`).
- If props are empty, validation falls back to the hardcoded defaults — so **always run `configurarCredenciales`** after deploying.

## Key entry points

- **Backend**: `Code.gs` → `doGet(e)` is the landing function. It validates credentials, checks a 300s cache (key: `galeria_<FOLDER_ID>`), and returns media grouped by Drive subfolder category.
- **Frontend**: `index.html` → `DOMContentLoaded` calls `mostrarLogin()` then, after login, `iniciarGaleria(data)` which sets `mediosGlobal` and renders the gallery.
- **Apps Script URL** is hardcoded in `script.js:8`. If you redeploy the web app, update this URL.

## Media & Drive organization

- The backend scans a **single Drive folder** (ID: `1V5VbwXVJqkdzhljFdRuy4f5WXDp0cf4Y`). Subfolders within it are treated as categories.
- Only files matching supported extensions are included:
  - **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`
  - **Videos**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`
- The `esMultimedia_` function in `Code.gs` filters by extension. Add new extensions to `EXT_IMAGEN` or `EXT_VIDEO` in either file.

## Cache

- Results are cached for **300 seconds** (Code.gs `CACHE_SEGUNDOS`).
- Append `?refresh=1` to the URL to bypass the cache.

## Visual design — 60-30-10 color rule

The palette follows a strict 60-30-10 split. Keep it when adding styles:

- **60% — Background**: soft cream (`--color-fondo: #FFFDF5`, `--color-fondo-alt: #FFFFFF`). Dominant surface; lets the photos stand out.
- **30% — Structure**: apple green (`--color-estructura: #7CB342`) + sky blue (`--color-azul: #5DADE2`). Used for the header, nav frame, section titles, card frames and category accents.
- **10% — Accent**: vibrant amber (`--color-acento: #FFB300` / `--color-acento-hover: #FF8F00`). Reserved for important buttons only: "Ingresar", scroll-to-top, active nav item, active slideshow, the play badge and the header star. Do not use it for decoration.

Typography: `Inter` for UI text and `Playfair Display` (`--font-display`) for the exhibition name in the header.

## Frontend specifics

- **Floating nav**: `construirNavFlotante()` (in `script.js`) rebuilds `.float-nav` after each render using the real Drive categories, so buttons always match the folders. Each section gets `id="seccion-<slug>"` via `slugCategoria()`; clicking scrolls to it and `actualizarEstadoFlotante()` highlights the section in view. The first button ("★ Inicio", `data-target="top"`) scrolls to the very top of the page, where the header is. The bar can also be moved by hand: mouse wheel (vertical wheel becomes horizontal), click-and-drag, and touch swipe (`activarScrollNav()`). `centrarBotonActivo()` slides it to the active category, but pauses for 3s after manual input (`navScrollManualHasta`) and only runs when the active category changes. The nav is hidden while empty (`.float-nav:empty`).
- **Lightbox**: click or press Enter/Space on any card. Close with Esc or clicking outside. Keyboard arrows navigate. Focus is trapped inside the lightbox.
- **Slideshow**: spacebar toggles. Speed is controlled by a range input (1–10s, default 4s). Auto-stops on user interaction.
- **Animations**: `initAnimaciones()` observes every card immediately (no per-card `setTimeout` backlog) with `rootMargin: '150px 0px 0px 0px'` and `threshold: 0`, so images reveal as soon as they approach the viewport. Cards in the same batch get a short stagger through the `--retardo` custom property (35ms each, max 8). `.tarjeta--visible` uses `animation-fill-mode: backwards` on purpose: the final `transform` falls back to the rule, so the 3D hover tilt can apply. Speeds are controlled by `--duracion-fade` and `--cubic-bezier` in `style.css`.
- **Ambient background effects**: `.bg-lines` holds four blurred `.bg-lines__orbe` glows, six `.bg-lines__line` light streaks and a `.bg-lines__destellos` container filled by `crearDestellosFondo()` (36 twinkling sparkles with random position/size/delay). `activarLuzPuntero()` moves a green/blue halo (`.bg-luz`) with the pointer by writing `--mx`/`--my` on `:root`; it only runs when `(hover: hover)`. Keep sparkle colors inside the green/blue structure family and use amber sparingly (60-30-10 rule).
- **Card hover**: `activarEfectoTarjetas()` writes `--tiltX`/`--tiltY` (3D tilt, max 9deg) and `--cx`/`--cy` (cursor spotlight `.tarjeta__spot`) per card on `pointermove`. The animated gradient ring is `.tarjeta::before` and only animates on `:hover` so hundreds of cards don't animate at once.
- **Scroll progress**: `actualizarProgresoScroll()` sets the width of `#scrollProgresoBarra` (`.scroll-progreso`, 3px at the top). Runs on `scroll` and `resize`.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` stops the large movements (orbs, streaks, sweeps, tilt, card entrance) but keeps the soft glow pulses. Test with it on — the in-app browser may report `reduce` and hide the ambient animations.
- **Skeleton shimmer**: while images load, a gradient shimmer plays (`tarjeta__skeleton`). Remove it after load (350ms timeout).
- **Scroll-top button**: `#btnArriba` sits above the floating nav. `actualizarAltoNav()` writes the nav's real height to the `--alto-nav` custom property, and `.btn-arriba` uses `bottom: calc(var(--alto-nav, 0px) + 1.25rem)`. Re-run it if the nav height can change.

## Common gotchas

- If the web app returns `error`, the frontend shows "Usuario o contraseña incorrectos" — verify you ran `configurarCredenciales` in the GAS editor.
- The gallery is hidden (`display: none`) until login succeeds.
- `sessionStorage` preserves gallery data across page reloads; clearing it forces re-login.
- The Drive folder ID is hardcoded in `Code.gs:16`. Change it if the media structure changes.
- No local build/lint/test steps exist — this is a pure GAS + static files project. Edits to `Code.gs` must be deployed; edits to `script.js`/`style.css` take effect immediately in the hosted HTML.