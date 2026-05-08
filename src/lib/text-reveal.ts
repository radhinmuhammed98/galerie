// Split text helper : découpe un texte en mots ou lettres,
// puis anime chaque token au scroll (y, blur, opacity, stagger).
// Conserve l'accessibilité via aria-label sur le conteneur.
import { gsap, ScrollTrigger } from "./gsap-config";

export type SplitMode = "words" | "letters";

export interface TextRevealOptions {
  mode?: SplitMode;
  stagger?: number;
  duration?: number;
  ease?: string;
  yPercent?: number;
  blurPx?: number;
  scrollTrigger?: { start?: string; once?: boolean };
  delay?: number;
  transformOrigin?: string;
}

/**
 * Découpe le textContent de `el` en spans. Les espaces sont conservés.
 * En mode "letters", chaque mot est wrap dans un span inline-block + white-space:nowrap
 * pour empêcher le browser de couper un mot au milieu (chaque lettre étant inline-block).
 */
export function splitText(el: HTMLElement, mode: SplitMode = "words"): HTMLSpanElement[] {
  const original = el.textContent ?? "";
  if (!original.trim()) return [];

  if (!el.hasAttribute("aria-label")) {
    el.setAttribute("aria-label", original);
  }

  el.innerHTML = "";
  const tokens: HTMLSpanElement[] = [];

  if (mode === "words") {
    // Découpe par mots, conserve les espaces entre
    const parts = original.split(/(\s+)/);
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        el.appendChild(document.createTextNode(part));
      } else if (part) {
        const wrapper = document.createElement("span");
        wrapper.className = "text-reveal__word";
        wrapper.style.display = "inline-block";
        wrapper.style.willChange = "transform, opacity, filter";
        const inner = document.createElement("span");
        inner.className = "text-reveal__inner";
        inner.style.display = "inline-block";
        inner.textContent = part;
        wrapper.appendChild(inner);
        wrapper.setAttribute("aria-hidden", "true");
        el.appendChild(wrapper);
        tokens.push(inner);
      }
    }
  } else {
    // Découpe par lettres : chaque mot wrap dans un span inline-block + nowrap
    // pour que les lettres d'un même mot restent groupées (pas de coupure mid-word).
    const parts = original.split(/(\s+)/);
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        el.appendChild(document.createTextNode(part));
      } else if (part) {
        const wordWrap = document.createElement("span");
        wordWrap.className = "text-reveal__word-wrap";
        wordWrap.style.display = "inline-block";
        wordWrap.style.whiteSpace = "nowrap";
        for (const char of Array.from(part)) {
          const span = document.createElement("span");
          span.className = "text-reveal__letter";
          span.style.display = "inline-block";
          span.style.willChange = "transform, opacity, filter";
          span.textContent = char;
          span.setAttribute("aria-hidden", "true");
          wordWrap.appendChild(span);
          tokens.push(span);
        }
        el.appendChild(wordWrap);
      }
    }
  }

  return tokens;
}

/**
 * Split + anime les tokens à l'entrée du scroll.
 */
export function revealText(el: HTMLElement, opts: TextRevealOptions = {}): HTMLSpanElement[] {
  const {
    mode = "words",
    stagger = 0.06,
    duration = 1.1,
    ease = "cubic-bezier(0.65, 0, 0.35, 1)",
    yPercent = 100,
    blurPx = 15,
    scrollTrigger,
    delay = 0,
    transformOrigin = "0% 100%",
  } = opts;

  const tokens = splitText(el, mode);
  if (!tokens.length) return tokens;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    tokens.forEach((t) => {
      t.style.opacity = "1";
      t.style.transform = "none";
      t.style.filter = "none";
    });
    return tokens;
  }

  gsap.set(tokens, { yPercent, opacity: 0, filter: `blur(${blurPx}px)`, transformOrigin });
  gsap.to(tokens, {
    yPercent: 0,
    opacity: 1,
    filter: "blur(0px)",
    duration,
    ease,
    stagger,
    delay,
    scrollTrigger: scrollTrigger
      ? { trigger: el, start: scrollTrigger.start ?? "top 85%", once: scrollTrigger.once ?? true }
      : undefined,
  });

  return tokens;
}

/**
 * Letter reveal subtil (pour les citations) : opacity + petit y.
 */
export function revealLetters(
  el: HTMLElement,
  opts: { stagger?: number; duration?: number; scrollTrigger?: { start?: string; once?: boolean } } = {}
): HTMLSpanElement[] {
  const { stagger = 0.025, duration = 0.6, scrollTrigger } = opts;
  const tokens = splitText(el, "letters");
  if (!tokens.length) return tokens;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    tokens.forEach((t) => { t.style.opacity = "1"; });
    return tokens;
  }

  gsap.set(tokens, { opacity: 0, y: 8 });
  gsap.to(tokens, {
    opacity: 1,
    y: 0,
    duration,
    ease: "power2.out",
    stagger,
    scrollTrigger: scrollTrigger
      ? { trigger: el, start: scrollTrigger.start ?? "top 80%", once: scrollTrigger.once ?? true }
      : undefined,
  });

  return tokens;
}

/** Auto-bind : applique revealText sur tous les [data-text-reveal] */
export function autoBindTextReveal(): void {
  document.querySelectorAll<HTMLElement>("[data-text-reveal]").forEach((el) => {
    const mode = (el.dataset.textReveal as SplitMode) || "words";
    const start = el.dataset.textRevealStart || "top 85%";
    revealText(el, { mode, scrollTrigger: { start, once: true } });
  });
}

void ScrollTrigger;
