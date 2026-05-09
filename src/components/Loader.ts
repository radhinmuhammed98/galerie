// Loader cinematographique : il attend la page ET un minimum de 2 secondes.
// Ainsi le chargement reste logique sur connexion lente, mais conserve toujours
// une entree premium meme lorsque les assets sont deja en cache.

const MIN_VISIBLE_MS = 2000;
const REVEAL_HOLD_MS = 220;
const SPLIT_DURATION_MS = 1350;
const FADEOUT_DURATION_MS = 650;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForPageReady = () => new Promise<void>((resolve) => {
  if (document.readyState === "complete") {
    resolve();
    return;
  }

  window.addEventListener("load", () => resolve(), { once: true });
  document.addEventListener("astro:page-load", () => resolve(), { once: true });
});

export function initLoader(): void {
  const loader = document.getElementById("orfevres-loader");
  if (!loader || loader.dataset.running === "true") return;
  loader.dataset.running = "true";
  loader.dataset.state = "initial";
  loader.style.display = "block";
  loader.style.opacity = "1";

  const fill = loader.querySelector<HTMLElement>(".loader__bar-fill");
  const pctEl = document.getElementById("loader-pct");
  const bar = loader.querySelector<HTMLElement>(".loader__bar");

  if (fill) {
    fill.style.transition = "none";
    fill.style.transform = "scaleX(0)";
    void fill.offsetWidth;
    fill.style.transition = `transform ${MIN_VISIBLE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`;
    fill.style.transform = "scaleX(1)";
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startMs = performance.now();
  const intervalId = window.setInterval(() => {
    const elapsed = performance.now() - startMs;
    const t = Math.min(1, elapsed / MIN_VISIBLE_MS);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const pct = Math.round(eased * 100);
    if (pctEl) pctEl.textContent = String(pct);
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    if (t >= 1) window.clearInterval(intervalId);
  }, 70);

  const hideImmediate = () => {
    window.clearInterval(intervalId);
    loader.dataset.state = "done";
    loader.dataset.running = "false";
    loader.style.display = "none";
  };

  Promise.all([wait(MIN_VISIBLE_MS), waitForPageReady()]).then(async () => {
    window.clearInterval(intervalId);
    if (pctEl) pctEl.textContent = "100";
    if (bar) bar.setAttribute("aria-valuenow", "100");

    await wait(REVEAL_HOLD_MS);
    loader.dataset.state = "reveal";

    if (reduced) {
      await wait(180);
      hideImmediate();
      return;
    }

    await wait(SPLIT_DURATION_MS);
    loader.dataset.state = "fadeout";
    await wait(FADEOUT_DURATION_MS);
    hideImmediate();
  });
}
