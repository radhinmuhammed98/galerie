// Magnetic interaction : un élément (et optionnellement son contenu intérieur)
// est légèrement attiré par la souris quand elle entre dans son rayon d'influence.
// Reset smooth à elastic.out quand la souris quitte. Désactivé sur tactile + reduced-motion.
import { gsap } from "./gsap-config";

export interface MagneticOptions {
  /** Rayon d'influence en pixels (défaut 80) */
  radius?: number;
  /** Amplitude max du déplacement de l'élément (défaut 12) */
  maxAmp?: number;
  /** Sélecteur CSS d'un enfant qui bouge MOINS pour effet de profondeur */
  innerSelector?: string;
  /** Amplitude max du sous-élément (défaut maxAmp / 2) */
  innerAmp?: number;
  /** Durée du tween (défaut 0.5s) */
  duration?: number;
  /** Easing (défaut "power3.out" pendant, "elastic.out(1, 0.5)" au reset) */
  ease?: string;
  resetEase?: string;
}

/**
 * Applique l'effet magnetic à un élément. Retourne une fonction de cleanup.
 */
export function magnetic(el: HTMLElement, opts: MagneticOptions = {}): () => void {
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!isFinePointer || reduced) return () => {};

  const {
    radius = 80,
    maxAmp = 12,
    innerSelector,
    innerAmp = maxAmp / 2,
    duration = 0.5,
    ease = "power3.out",
    resetEase = "elastic.out(1, 0.5)",
  } = opts;

  const inner = innerSelector ? el.querySelector<HTMLElement>(innerSelector) : null;

  // quickTo pour des perfs optimales
  const ox = gsap.quickTo(el, "x", { duration, ease });
  const oy = gsap.quickTo(el, "y", { duration, ease });
  const ix = inner ? gsap.quickTo(inner, "x", { duration: duration * 0.85, ease }) : null;
  const iy = inner ? gsap.quickTo(inner, "y", { duration: duration * 0.85, ease }) : null;

  let inside = false;

  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      const k = (1 - dist / radius);
      ox(dx * k * (maxAmp / radius));
      oy(dy * k * (maxAmp / radius));
      if (ix && iy) {
        ix(dx * k * (innerAmp / radius));
        iy(dy * k * (innerAmp / radius));
      }
      if (!inside) inside = true;
    } else if (inside) {
      // On vient de sortir du rayon : reset elastic
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: resetEase, overwrite: true });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.7, ease: resetEase, overwrite: true });
      inside = false;
    }
  };

  // Listener global : meilleur que mousemove sur l'élément seul (le rayon dépasse l'élément)
  window.addEventListener("mousemove", onMove, { passive: true });

  // Au mouseleave de la fenêtre, reset
  const onLeaveDoc = () => {
    if (inside) {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: resetEase, overwrite: true });
      if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.7, ease: resetEase, overwrite: true });
      inside = false;
    }
  };
  document.documentElement.addEventListener("mouseleave", onLeaveDoc);

  return () => {
    window.removeEventListener("mousemove", onMove);
    document.documentElement.removeEventListener("mouseleave", onLeaveDoc);
    gsap.set(el, { x: 0, y: 0 });
    if (inner) gsap.set(inner, { x: 0, y: 0 });
  };
}

/**
 * Auto-bind : applique magnetic sur tous les [data-magnetic].
 * Options via data-attributes :
 *   data-magnetic-radius, data-magnetic-amp,
 *   data-magnetic-inner (sélecteur), data-magnetic-inner-amp
 */
export function autoBindMagnetic(): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const opts: MagneticOptions = {};
    if (el.dataset.magneticRadius) opts.radius = parseFloat(el.dataset.magneticRadius);
    if (el.dataset.magneticAmp)    opts.maxAmp = parseFloat(el.dataset.magneticAmp);
    if (el.dataset.magneticInner)  opts.innerSelector = el.dataset.magneticInner;
    if (el.dataset.magneticInnerAmp) opts.innerAmp = parseFloat(el.dataset.magneticInnerAmp);
    cleanups.push(magnetic(el, opts));
  });
  return () => cleanups.forEach((fn) => fn());
}
