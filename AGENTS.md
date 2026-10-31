# Galeria-luz-Orozco

This is a multimedia gallery web app for the "Luz Elena Orozco" exhibition. It has a Google Apps Script backend and a JavaScript/HTML frontend.

## Project structure

- `Code.gs` — Google Apps Script backend. Deploy as a **Web app** (Publish ▸ Web app). The URL becomes the API endpoint.
- `script.js` — Frontend logic: login, fetch data, render gallery + lightbox, slideshow, keyboard/swipe navigation, animations.
- `style.css` — Styling with CSS variables, animations, responsive design (flex/column grid).
- `index.html` — Page skeleton; loads `script.js` and `style.css`.
- `README.md` — Short project description.

## Secrets policy — read this before committing

`Code.gs` is versioned, so it must **never** contain real secrets. The Drive folder ID and the credentials live in **Script Properties** (`PropertiesService`), which exist only inside the Apps Script project.

- Property keys: `GALERIA_FOLDER_ID`, `GALERIA_USUARIO`, `GALERIA_CONTRASENA`.
- Setup once from the Apps Script editor: `configurarGaleria('ID_CARPETA', 'usuario', 'contraseña')`.
- Rotate only the password: `configurarCredenciales('usuario', 'nuevaContraseña')`.
- Inspect what is set (never prints the password): `verConfiguracion()`.
- There are **no default credentials**. If properties are missing, `doGet` returns `Servidor no configurado` instead of falling back to a hardcoded user.
- Never commit the folder ID, passwords, tokens or the `.clasp.json` file. `README.md` and `AGENTS.md` must not contain real values either.

## Authentication

- Credentials are checked via the `user` and `pass` query params on the web app URL (`?user=...&pass=`).
- `validarCredenciales_` compares both values with `igualdadSegura_` (constant-time), so timing cannot leak length or content.
- Errors returned to the client are generic (`Credenciales inválidas`, `Error del servidor`); details go to `console.error` in the Apps Script log.

## Key entry points

- **Backend**: `Code.gs` → `doGet(e)` is the landing function. It reads the config from Script Properties, validates credentials, checks a 300s cache (key: `galeria_<folderId>`), and returns media grouped by Drive subfolder category.
- **Frontend**: `index.html` → `DOMContentLoaded` calls `mostrarLogin()` then, after login, `iniciarGaleria(data)` which sets `mediosGlobal` and renders the gallery.
- **Apps Script URL** is hardcoded in `script.js:8`. This URL is public by design (the browser calls it); it is not a secret. If you redeploy the web app, update this URL.

## Media & Drive organization

- The backend scans a **single Drive folder** configured at deploy time via `configurarGaleria(...)`; the ID is never written in the repo. Subfolders within it are treated as categories.
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

- If the web app returns `error`, the frontend shows "Usuario o contraseña incorrectos" — verify you ran `configurarGaleria(...)` / `configurarCredenciales(...)` in the GAS editor and that the deployment was updated.
- The gallery is hidden (`display: none`) until login succeeds.
- `sessionStorage` preserves gallery data across page reloads; clearing it forces re-login.
- The Drive folder ID is **not** in the code: change it with `configurarGaleria('NUEVO_ID', ...)` if the media structure changes.
- After editing `Code.gs` you must **deploy a new version** (Publish ▸ Manage deployments ▸ Edit ▸ Version: New). Running the editor alone does not update the public URL.
- No local build/lint/test steps exist — this is a pure GAS + static files project. Edits to `Code.gs` must be deployed; edits to `script.js`/`style.css` take effect immediately in the hosted HTML.