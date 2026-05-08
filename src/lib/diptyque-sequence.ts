// Diptyque scrollytelling : 2 séquences d'images sur canvas, scrubbed en synchro.
// Réutilise la philosophie de scroll-sequence.ts mais avec 2 canvas pilotés
// par UN SEUL ScrollTrigger pour garantir la synchronisation parfaite.
import { gsap, ScrollTrigger } from "./gsap-config";

export interface DiptyqueOptions {
  canvasLeft: HTMLCanvasElement;
  canvasRight: HTMLCanvasElement;
  section: HTMLElement;
  framePathLeft: (i: number) => string;
  framePathRight: (i: number) => string;
  frameCount: number;
  loaderEl?: HTMLElement | null;
  progressEl?: HTMLElement | null;
  /** Appelé à chaque update du scroll, valeur 0..1 */
  onProgress?: (progress: number) => void;
}

export function initDiptyqueSequence(opts: DiptyqueOptions): () => void {
  const {
    canvasLeft, canvasRight, section,
    framePathLeft, framePathRight, frameCount,
    loaderEl, progressEl, onProgress,
  } = opts;

  const ctxLeft = canvasLeft.getContext("2d", { alpha: false });
  const ctxRight = canvasRight.getContext("2d", { alpha: false });
  if (!ctxLeft || !ctxRight) return () => {};

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const framesLeft: HTMLImageElement[] = new Array(frameCount);
  const framesRight: HTMLImageElement[] = new Array(frameCount);
  let lastDrawnIdx = -1;
  let loadedCount = 0;
  const totalToLoad = frameCount * 2;

  const resizeCanvas = (canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };

  // object-cover : couvre tout le canvas (peut cropper) — fait sens en split 50/50
  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement
  ) => {
    if (!img.complete || img.naturalWidth === 0) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
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
    const imgL = framesLeft[idx];
    const imgR = framesRight[idx];
    let drewSomething = false;
    if (imgL && imgL.complete && imgL.naturalWidth > 0) {
      drawFrame(ctxLeft, canvasLeft, imgL);
      drewSomething = true;
    }
    if (imgR && imgR.complete && imgR.naturalWidth > 0) {
      drawFrame(ctxRight, canvasRight, imgR);
      drewSomething = true;
    }
    if (drewSomething) lastDrawnIdx = idx;
    else if (lastDrawnIdx >= 0) {
      // Fallback : redessine la dernière frame complète si la cible n'est pas prête
      const fL = framesLeft[lastDrawnIdx];
      const fR = framesRight[lastDrawnIdx];
      if (fL) drawFrame(ctxLeft, canvasLeft, fL);
      if (fR) drawFrame(ctxRight, canvasRight, fR);
    }
  };

  // Préchargement parallèle
  const ready: Promise<void> = new Promise((resolve) => {
    let resolvedEarly = false;
    const minToStart = Math.min(60, totalToLoad); // 30 par côté

    const loadFrame = (path: string, arr: HTMLImageElement[], i: number) => {
      const img = new Image();
      img.decoding = "async";
      img.src = path;
      arr[i] = img;
      const done = () => {
        loadedCount++;
        if (progressEl) {
          progressEl.textContent = String(Math.round((loadedCount / totalToLoad) * 100));
        }
        if (!resolvedEarly && loadedCount >= minToStart) {
          resolvedEarly = true;
          resolve();
        }
        if (loadedCount === totalToLoad && loaderEl) {
          gsap.to(loaderEl, {
            opacity: 0,
            duration: 0.6,
            onComplete: () => loaderEl.style.display = "none",
          });
        }
      };
      img.onload = done;
      img.onerror = done;
    };

    for (let i = 0; i < frameCount; i++) {
      loadFrame(framePathLeft(i), framesLeft, i);
      loadFrame(framePathRight(i), framesRight, i);
    }

    // Safety fallback : démarre quand même après 6s
    setTimeout(() => {
      if (!resolvedEarly) { resolvedEarly = true; resolve(); }
    }, 6000);
  });

  // Resize handler — redimensionne et redessine les 2 canvas
  let resizeRaf = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeCanvas(canvasLeft);
      resizeCanvas(canvasRight);
      if (lastDrawnIdx >= 0) renderAt(lastDrawnIdx);
    });
  };
  window.addEventListener("resize", onResize);

  resizeCanvas(canvasLeft);
  resizeCanvas(canvasRight);

  // Reduced-motion : afficher la frame du milieu fixe
  if (reduced) {
    const midIdx = Math.floor(frameCount / 2);
    const imgL = new Image();
    const imgR = new Image();
    imgL.onload = () => { framesLeft[midIdx] = imgL; renderAt(midIdx); };
    imgR.onload = () => { framesRight[midIdx] = imgR; renderAt(midIdx); };
    imgL.src = framePathLeft(midIdx);
    imgR.src = framePathRight(midIdx);
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
        scrub: 1.4, // lerp généreux pour matcher le rythme contemplatif du Hero/ScrollVideo
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          renderAt(proxy.frame);
          onProgress?.(self.progress);
        },
      },
    });
    scrollTrigger = tween.scrollTrigger ?? null;
    ScrollTrigger.refresh();
    console.log(`[Diptyque] init OK — ${frameCount} frames × 2, prêts: ${loadedCount}/${totalToLoad}`);
  });

  return () => {
    window.removeEventListener("resize", onResize);
    cancelAnimationFrame(resizeRaf);
    scrollTrigger?.kill();
  };
}
