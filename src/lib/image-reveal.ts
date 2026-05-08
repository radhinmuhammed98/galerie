// Reveals d'images cinématiques :
//  - mask diagonal 45° qui se rétracte
//  - curtain vertical qui descend
// Combinés avec un léger scale 1.05 → 1 pour un effet "respirant".
import { gsap, ScrollTrigger } from "./gsap-config";

export type RevealDirection = "diagonal" | "curtain-top" | "curtain-bottom";

export interface ImageRevealOptions {
  direction?: RevealDirection;
  duration?: number;
  ease?: string;
  scaleFrom?: number;
  scaleDuration?: number;
  /** Couleur du masque (par défaut : noir-orfevre) */
  coverColor?: string;
  scrollTrigger?: { start?: string; once?: boolean };
  delay?: number;
}

/**
 * Prépare un container <div> pour un reveal :
 *  - ajoute un overlay coloré (.image-reveal__cover)
 *  - met overflow:hidden + position:relative
 *  - retourne le node overlay créé pour qu'on puisse l'animer
 */
function prepareContainer(container: HTMLElement, color: string): HTMLDivElement {
  // Évite la double init si appelé deux fois
  let cover = container.querySelector<HTMLDivElement>(":scope > .image-reveal__cover");
  if (cover) return cover;

  const computed = getComputedStyle(container);
  if (computed.position === "static") container.style.position = "relative";
  container.style.overflow = "hidden";

  cover = document.createElement("div");
  cover.className = "image-reveal__cover";
  cover.style.position = "absolute";
  cover.style.inset = "0";
  cover.style.background = color;
  cover.style.willChange = "transform, clip-path";
  cover.style.zIndex = "2";
  cover.style.pointerEvents = "none";
  container.appendChild(cover);
  return cover;
}

/**
 * Anime le reveal selon la direction choisie.
 * `targetImage` (optionnel) : image enfant qui sera mise en scale 1.05 → 1.
 */
export function revealImage(
  container: HTMLElement,
  opts: ImageRevealOptions = {},
  targetImage?: HTMLElement
): void {
  const {
    direction = "diagonal",
    duration = 1.2,
    ease = "expo.out",
    scaleFrom = 1.05,
    scaleDuration = 1.6,
    coverColor = "#0A0A0A",
    scrollTrigger,
    delay = 0,
  } = opts;

  const cover = prepareContainer(container, coverColor);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // État initial selon direction
  if (direction === "diagonal") {
    // Cover full, on l'animera avec clip-path qui retracte du coin top-left au bottom-right
    gsap.set(cover, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" });
  } else if (direction === "curtain-top") {
    // Cover full, on le translateY vers le bas (descend)
    gsap.set(cover, { y: "0%", scaleY: 1, transformOrigin: "top center" });
  } else if (direction === "curtain-bottom") {
    gsap.set(cover, { y: "0%", scaleY: 1, transformOrigin: "bottom center" });
  }

  // Image en scale légèrement plus grande au départ
  if (targetImage) {
    gsap.set(targetImage, { scale: scaleFrom, transformOrigin: "center" });
  }

  if (prefersReducedMotion) {
    cover.style.display = "none";
    if (targetImage) gsap.set(targetImage, { scale: 1 });
    return;
  }

  const stCommon = scrollTrigger
    ? { trigger: container, start: scrollTrigger.start ?? "top 80%", once: scrollTrigger.once ?? true }
    : undefined;

  // Anime le cover
  if (direction === "diagonal") {
    // Clip-path se rétracte selon une diagonale (haut-gauche vers bas-droit)
    gsap.to(cover, {
      clipPath: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)",
      duration,
      ease,
      delay,
      scrollTrigger: stCommon,
      onComplete: () => { cover.style.display = "none"; },
    });
  } else if (direction === "curtain-top") {
    // Le cover descend (translateY 100%) — révèle l'image du haut vers le bas
    gsap.to(cover, {
      y: "100%",
      duration,
      ease: "power4.out",
      delay,
      scrollTrigger: stCommon,
      onComplete: () => { cover.style.display = "none"; },
    });
  } else if (direction === "curtain-bottom") {
    gsap.to(cover, {
      y: "-100%",
      duration,
      ease: "power4.out",
      delay,
      scrollTrigger: stCommon,
      onComplete: () => { cover.style.display = "none"; },
    });
  }

  // Image scale-down en parallèle (effet "respirante")
  if (targetImage) {
    gsap.to(targetImage, {
      scale: 1,
      duration: scaleDuration,
      ease: "power2.out",
      delay,
      scrollTrigger: stCommon,
    });
  }
}

/**
 * Stagger sur plusieurs containers — pour la mosaïque Gallery.
 */
export function revealImagesStaggered(
  containers: NodeListOf<HTMLElement> | HTMLElement[],
  opts: ImageRevealOptions & { stagger?: number; imageSelector?: string } = {}
): void {
  const { stagger = 0.15, imageSelector = "img" } = opts;
  const arr = Array.from(containers);
  arr.forEach((container, i) => {
    const img = container.querySelector<HTMLElement>(imageSelector) ?? undefined;
    revealImage(
      container,
      { ...opts, delay: (opts.delay ?? 0) + i * stagger },
      img ?? undefined
    );
  });
}

void ScrollTrigger;
