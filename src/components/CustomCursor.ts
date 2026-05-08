import { gsap } from "../lib/gsap-config";

export type CursorState = "default" | "link" | "text" | "image" | "drag";

interface StateMatch {
  state: CursorState;
  label: string;
}

/**
 * Détermine l'état curseur depuis l'élément survolé.
 * Priorité : data-cursor explicite (override) > sélecteur sémantique implicite.
 * Remonte la hiérarchie via closest() — coût O(profondeur DOM), négligeable.
 */
function detectState(target: Element | null): StateMatch {
  if (!target) return { state: "default", label: "" };

  // 1) Override explicite via data-cursor / data-cursor-label
  const explicit = target.closest<HTMLElement>("[data-cursor]");
  if (explicit) {
    const state = ((explicit.dataset.cursor as CursorState) || "default") as CursorState;
    const label = explicit.dataset.cursorLabel ?? defaultLabelForState(state);
    return { state, label };
  }

  // 2) Détection implicite — ordre = priorité décroissante
  if (target.closest("a, button, [role='button'], select, label[for]")) {
    return { state: "link", label: "" };
  }
  if (target.closest("img, picture, video, canvas")) {
    return { state: "image", label: "voir" };
  }
  if (target.closest("p, h1, h2, h3, h4, h5, h6, blockquote, li, address, em, strong, span")) {
    // Le span "spam" est large mais on capte mieux les blocs textuels du site
    return { state: "text", label: "" };
  }

  return { state: "default", label: "" };
}

function defaultLabelForState(state: CursorState): string {
  switch (state) {
    case "image": return "voir";
    case "drag":  return "Glisser";
    default:      return "";
  }
}

/**
 * Initialise le curseur custom contextuel.
 * Retourne une fonction de cleanup pour les transitions de page (View Transitions Astro).
 */
export function initCustomCursor(): () => void {
  // Désactivé sur tactile — pas de cleanup nécessaire
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return () => {};
  }

  const cursor = document.getElementById("custom-cursor");
  if (!cursor) return () => {};

  const labelEl = cursor.querySelector<HTMLElement>(".cursor-label");
  document.documentElement.classList.add("cursor-active");

  // GSAP quickTo : lerp doux (~0.18s) sans coût notable
  const xMove = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3.out" });
  const yMove = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3.out" });

  let currentState: CursorState = "default";
  let currentLabel = "";

  const setState = (state: CursorState, label: string) => {
    if (state !== currentState) {
      cursor.dataset.state = state;
      currentState = state;
    }
    if (label !== currentLabel) {
      if (labelEl) labelEl.textContent = label;
      currentLabel = label;
    }
  };

  // Suivi position + détection état (même handler — économise un listener)
  const onMouseMove = (e: MouseEvent) => {
    xMove(e.clientX);
    yMove(e.clientY);
    if (cursor.dataset.visible !== "true") cursor.dataset.visible = "true";

    const target = e.target as Element | null;
    const { state, label } = detectState(target);
    setState(state, label);
  };

  const onLeaveDoc  = () => { cursor.dataset.visible = "false"; };
  const onEnterDoc  = () => { cursor.dataset.visible = "true"; };
  const onPressDown = () => { cursor.dataset.pressed = "true"; };
  const onPressUp   = () => { cursor.dataset.pressed = "false"; };

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  document.documentElement.addEventListener("mouseleave", onLeaveDoc);
  document.documentElement.addEventListener("mouseenter", onEnterDoc);
  window.addEventListener("mousedown", onPressDown);
  window.addEventListener("mouseup", onPressUp);
  window.addEventListener("blur", onLeaveDoc);

  // Cleanup pour les transitions de page (View Transitions)
  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    document.documentElement.removeEventListener("mouseleave", onLeaveDoc);
    document.documentElement.removeEventListener("mouseenter", onEnterDoc);
    window.removeEventListener("mousedown", onPressDown);
    window.removeEventListener("mouseup", onPressUp);
    window.removeEventListener("blur", onLeaveDoc);
    document.documentElement.classList.remove("cursor-active");
  };
}
