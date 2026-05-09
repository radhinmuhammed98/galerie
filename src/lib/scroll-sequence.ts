// Scrub d'une séquence d'images sur canvas (technique Apple AirPods Pro / Stripe)
// Bypass le décodeur vidéo : chaque frame est un draw d'image immédiat → 60fps garanti.
import { gsap, ScrollTrigger } from "./gsap-config";

export interface ScrollSequenceOptions {
  canvas: HTMLCanvasElement;
  section: HTMLElement;
  framePath: (i: number) => string; // (0..count-1) → URL
  frameCount: number;
  loaderEl?: HTMLElement | null;
  progressEl?: HTMLElement | null;
  onProgress?: (progress: number) => void; // appelé à chaque update du scroll (0..1)
  /** ratio largeur/hauteur de la frame source pour ajuster le canvas (défaut: déduit de la première image) */
  sourceAspect?: number;
  mobileFit?: "contain" | "cover";
}

export function initScrollSequence(opts: ScrollSequenceOptions): () => void {
  const { canvas, section, framePath, frameCount, loaderEl, progressEl, onProgress, mobileFit = "cover" } = opts;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return () => {};

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const frames: HTMLImageElement[] = new Array(frameCount);
  let lastDrawnIdx = -1;

  let aspect = opts.sourceAspect ?? 1;

  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };

  const drawFrame = (img: HTMLImageElement) => {
    if (!img.complete || img.naturalWidth === 0) return;
    const cw = canvas.width;
    const ch = canvas.height;

    // object-contain : tout afficher sans crop
    const shouldCover = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches && mobileFit === "cover";
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Desktop conserve le cadrage editorial ; mobile couvre tout l'ecran.
    const scale = shouldCover ? Math.max(cw / iw, ch / ih) : Math.min(cw / iw, ch / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;

    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);
  };

  const renderAt = (frameFloat: number) => {
    const idx = Math.max(0, Math.min(frameCount - 1, Math.round(frameFloat)));
    const img = frames[idx];
    if (img && img.complete && img.naturalWidth > 0) {
      drawFrame(img);
      lastDrawnIdx = idx;
    } else if (lastDrawnIdx >= 0) {
      // Frame demandée pas encore prête → on garde la dernière dessinée
      const fallback = frames[lastDrawnIdx];
      if (fallback) drawFrame(fallback);
    }
  };

  // Préchargement : démarre dès que les 25 premières frames sont prêtes
  let loadedCount = 0;
  const ready: Promise<void> = new Promise((resolve) => {
    let resolvedEarly = false;
    const minToStart = Math.min(25, frameCount);

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = framePath(i);
      frames[i] = img;

      const done = () => {
        loadedCount++;
        if (progressEl) {
          progressEl.textContent = String(Math.round((loadedCount / frameCount) * 100));
        }
        if (!resolvedEarly && loadedCount >= minToStart) {
          resolvedEarly = true;
          resolve();
        }
        if (loadedCount === frameCount && loaderEl) {
          gsap.to(loaderEl, {
            opacity: 0,
            duration: 0.6,
            onComplete: () => loaderEl.style.display = "none",
          });
        }
      };
      img.onload = done;
      img.onerror = done;
    }

    // safety fallback
    setTimeout(() => {
      if (!resolvedEarly) { resolvedEarly = true; resolve(); }
    }, 5000);
  });

  // Resize handler (debounced)
  let resizeRaf = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeCanvas();
      // re-render dernière frame
      if (lastDrawnIdx >= 0) {
        const img = frames[lastDrawnIdx];
        if (img) drawFrame(img);
      }
    });
  };
  window.addEventListener("resize", onResize);

  // Init aspect après chargement de la première image
  const firstImg = new Image();
  firstImg.src = framePath(0);
  firstImg.onload = () => {
    aspect = firstImg.naturalWidth / firstImg.naturalHeight;
  };

  resizeCanvas();

  // Reduced-motion : afficher juste la frame du milieu, pas de scrub
  if (prefersReducedMotion) {
    const midIdx = Math.floor(frameCount / 2);
    const img = new Image();
    img.src = framePath(midIdx);
    img.onload = () => {
      frames[midIdx] = img;
      lastDrawnIdx = midIdx;
      drawFrame(img);
    };
    return () => window.removeEventListener("resize", onResize);
  }

  let scrollTrigger: ScrollTrigger | null = null;

  ready.then(() => {
    renderAt(0);

    const proxy = { frame: 0 };
    const tween = gsap.to(proxy, {
      frame: frameCount - 1,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.4, // lerp généreux : sensation cinématique très lente, contemplative
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          renderAt(proxy.frame);
          onProgress?.(self.progress);
        },
      },
    });
    scrollTrigger = tween.scrollTrigger ?? null;
    ScrollTrigger.refresh();
    console.log(`[ScrollSequence] init OK — ${frameCount} frames, prêt: ${loadedCount}`);
  });

  return () => {
    window.removeEventListener("resize", onResize);
    cancelAnimationFrame(resizeRaf);
    scrollTrigger?.kill();
  };
}
