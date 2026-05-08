// Loader cinématique : faux temps de chargement avec setTimeout uniquement.
// Aucun usage de requestAnimationFrame → tourne en tab hidden, low-power, etc.
// La barre de progression est animée via une transition CSS (transform: scaleX),
// donc le navigateur s'occupe seul du tween, pas de boucle JS.
//
// Comportement :
//  - Skip si déjà vu dans la session (sessionStorage)
//  - Skip si reduced-motion
//  - Sinon : barre 0→100% en 2.4s (transition CSS), puis split reveal, puis hide

const SESSION_KEY = "orfevres-loader-seen";
const FILL_DURATION_MS = 2400;
const REVEAL_HOLD_MS = 350;
// Split cinématique horizontal : 2.2s + 100ms de marge pour la fin de transition CSS
const SPLIT_DURATION_MS = 2300;
// Fondu final après l'ouverture du rideau : 0.9s + 100ms de marge
const FADEOUT_DURATION_MS = 1000;

export function initLoader(): void {
  const loader = document.getElementById("orfevres-loader");
  if (!loader) return;

  const hideImmediate = () => {
    loader.dataset.state = "done";
    loader.style.display = "none";
  };

  // Déjà vu ou reduced-motion : skip rapide
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    hideImmediate();
    return;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    sessionStorage.setItem(SESSION_KEY, "1");
    setTimeout(() => {
      loader.dataset.state = "reveal";
      setTimeout(hideImmediate, 400);
    }, 300);
    return;
  }

  const fill = loader.querySelector<HTMLElement>(".loader__bar-fill");
  const pctEl = document.getElementById("loader-pct");
  const bar = loader.querySelector<HTMLElement>(".loader__bar");

  // Animation barre : on configure une transition CSS et on déclenche le scaleX(1).
  // Le navigateur tween tout seul, indépendamment de rAF.
  if (fill) {
    fill.style.transition = `transform ${FILL_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;
    // Force un reflow pour s'assurer que la transition s'applique
    void fill.offsetWidth;
    fill.style.transform = "scaleX(1)";
  }

  // Compteur % : on échantillonne via setInterval (qui tourne même en tab hidden,
  // throttle à 1Hz mais ce n'est pas grave si la barre est animée par CSS)
  const startMs = performance.now();
  const intervalId = setInterval(() => {
    const elapsed = performance.now() - startMs;
    const t = Math.min(1, elapsed / FILL_DURATION_MS);
    // Easing manuel pour matcher la transition CSS (cubic-bezier ~ ease-in-out)
    const progress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const pct = Math.round(progress * 100);
    if (pctEl) pctEl.textContent = String(pct);
    if (bar)   bar.setAttribute("aria-valuenow", String(pct));
    if (t >= 1) clearInterval(intervalId);
  }, 80);

  // Chronologie complète :
  //   FILL → REVEAL_HOLD → state="reveal" (rideau s'ouvre) → state="fadeout" (loader fade) → display:none
  setTimeout(() => {
    clearInterval(intervalId);
    sessionStorage.setItem(SESSION_KEY, "1");
    if (pctEl) pctEl.textContent = "100";
    if (bar)   bar.setAttribute("aria-valuenow", "100");
    loader.dataset.state = "reveal";
    // Après l'ouverture du rideau : fondu sur tout le loader
    setTimeout(() => {
      loader.dataset.state = "fadeout";
      setTimeout(hideImmediate, FADEOUT_DURATION_MS);
    }, SPLIT_DURATION_MS);
  }, FILL_DURATION_MS + REVEAL_HOLD_MS);
}
