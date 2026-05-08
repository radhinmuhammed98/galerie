import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap-config";

export function initLenis() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return null;

  const lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
  });

  // Lenis pousse ScrollTrigger à chaque scroll pour synchroniser scrub/pin
  lenis.on("scroll", ScrollTrigger.update);

  // Branche le RAF de Lenis sur le ticker GSAP (une seule boucle d'animation)
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Refresh ScrollTrigger après chargement complet (images/vidéo qui changent la hauteur)
  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });

  return lenis;
}
