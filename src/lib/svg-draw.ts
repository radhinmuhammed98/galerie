// Helper SVG draw : trace progressivement une ligne via stroke-dashoffset.
// Pas besoin du plugin payant DrawSVGPlugin de GSAP — la primitive native est suffisante.
import { gsap, ScrollTrigger } from "./gsap-config";

export interface DrawOptions {
  duration?: number;
  ease?: string;
  delay?: number;
  /** Si défini, la ligne est tracée au scroll (start = top 80% par défaut) */
  scrollTrigger?: {
    trigger?: Element | string;
    start?: string;
    once?: boolean;
  };
  onComplete?: () => void;
}

/**
 * Prépare un élément SVG (path | line | polyline) pour qu'il puisse être "tracé".
 * Retourne sa longueur calculée (utile pour resize handler).
 */
export function prepareDraw(el: SVGGeometryElement): number {
  const length = el.getTotalLength();
  el.style.strokeDasharray = `${length} ${length}`;
  el.style.strokeDashoffset = `${length}`;
  return length;
}

/**
 * Anime stroke-dashoffset de length → 0 pour révéler le tracé.
 * Si `scrollTrigger` est fourni, l'anim se déclenche au scroll, sinon immédiate.
 */
export function drawSVG(el: SVGGeometryElement, opts: DrawOptions = {}): gsap.core.Tween {
  const length = prepareDraw(el);
  const { duration = 1.2, ease = "power3.out", delay = 0, onComplete, scrollTrigger } = opts;

  return gsap.to(el, {
    strokeDashoffset: 0,
    duration,
    ease,
    delay,
    onComplete,
    scrollTrigger: scrollTrigger
      ? {
          trigger: scrollTrigger.trigger,
          start: scrollTrigger.start ?? "top 80%",
          once: scrollTrigger.once ?? true,
          toggleActions: scrollTrigger.once ? "play none none none" : "play reverse play reverse",
        }
      : undefined,
  });
}

/** Trace plusieurs paths en stagger (pour les chiffres/lettres SVG composées) */
export function drawSVGStagger(
  els: NodeListOf<SVGGeometryElement> | SVGGeometryElement[],
  opts: DrawOptions & { stagger?: number } = {}
): gsap.core.Tween {
  const { duration = 1.2, ease = "power3.out", stagger = 0.15, scrollTrigger } = opts;
  const arr = Array.from(els);
  arr.forEach(prepareDraw);

  return gsap.to(arr, {
    strokeDashoffset: 0,
    duration,
    ease,
    stagger,
    scrollTrigger: scrollTrigger
      ? {
          trigger: scrollTrigger.trigger,
          start: scrollTrigger.start ?? "top 80%",
          once: scrollTrigger.once ?? true,
        }
      : undefined,
  });
}

// Évite l'avertissement TS unused
void ScrollTrigger;
