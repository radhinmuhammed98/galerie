# AGENTS.md — Galerie des Orfèvres

> Fichier de contexte persistant pour Google Antigravity. À placer à la racine du workspace.
> Tous les agents lancés sur ce projet liront ce fichier en priorité.

---

## 🎯 Contexte du projet

Refonte totale du site de la **Galerie des Orfèvres** (galerie d'art parisienne, 23 Place Dauphine, Paris 1er). Site existant : https://www.galerie-des-orfevres.fr/fr (fait par D-Studio, déjà très haut de gamme).

**Contraintes :**
- Budget client : 4000€
- Niveau attendu : Awwwards / FWA / Site of the Day
- Hébergement final : o2switch (FTP statique, donc pas de SSR runtime)
- Multilingue FR / EN

## 🛠️ Stack technique imposée

- **Astro 4+** avec TypeScript strict
- **Three.js** (shader hero, particules dorées)
- **GSAP 3 + ScrollTrigger** (animations scroll cinématiques)
- **Lenis** (smooth scroll inertiel)
- **TailwindCSS** (styling)
- **i18n natif Astro** (FR/EN)

⚠️ **Pas de** : Next.js, React standalone, frameworks SSR. Le site DOIT être statique pour o2switch.

## 🎨 Direction artistique

**Univers :** galerie d'art parisienne haut de gamme, savoir-faire, héritage, élégance intemporelle.

**Palette :**
```css
--noir-orfevre: #0A0A0A;
--ivoire: #F4EFE6;
--or-fonce: #B8935A;   /* accent doré subtil, jamais clinquant */
--or-clair: #D4B886;
--gris-pierre: #2A2A2A;
--blanc-pur: #FFFFFF;
```

**Typographie :**
- Titres : serif éditoriale (Cormorant Garamond ou Fraunces), gros, fin, kerning -2 à -3%
- Corps : sans-serif neutre élégante (Inter ou Neue Haas Grotesk fallback)
- H1 entre 8-12rem en desktop

**Principes :** beaucoup de blanc, images plein format, lowercase sur certains titres, curseur custom doré, transitions de page fluides, aucun élément criard.

## 📐 Règles de code

- TypeScript **strict**, jamais de `any`
- Composants Astro pour le markup, fichiers `.ts` séparés pour la logique complexe
- Commentaires en français sur les passages techniques (shader, scroll scrubbing, Lenis sync)
- Noms de variables / classes en français OK (cohérent avec le projet)
- Pas de duplication : factoriser dans `src/lib/`
- Respect strict de `prefers-reduced-motion` (désactiver les anims si activé)

## ⚡ Exigences perf

- Lighthouse desktop : Performance 95+, SEO 100, Best Practices 100, Accessibility 90+
- Animations 60fps (will-change, transform, GPU)
- Lazy loading sauf hero
- WebP avec fallback JPG via `<picture>` ou composant `<Image>` Astro
- Schema.org `LocalBusiness` + `ArtGallery` en JSON-LD
- Sitemap automatique (`@astrojs/sitemap`)

## 🎬 Section critique : Video Scroll Scrubbing

C'est LE morceau de bravoure du site. Vidéo MP4 fixée (`position: sticky`) qui défile en synchro avec le scroll via GSAP ScrollTrigger pilotant `video.currentTime`.

**Implémentation de référence :**
```html
<section class="video-scroll-section relative" style="height: 300vh;">
  <div class="sticky top-0 h-screen w-full overflow-hidden">
    <video id="scroll-video" src="/videos/heritage.mp4"
           muted playsinline preload="auto"
           class="w-full h-full object-cover"></video>
    <div class="overlay-text absolute inset-0 flex items-center justify-center"></div>
  </div>
</section>
```

```ts
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const video = document.getElementById('scroll-video') as HTMLVideoElement;
const section = document.querySelector('.video-scroll-section') as HTMLElement;

video.addEventListener('loadedmetadata', () => {
  video.currentTime = 0.01; // évite le cadre noir initial Safari
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => {
      video.currentTime = self.progress * video.duration;
    },
  });
});
```

**Encodage vidéo (à noter dans le README pour Cédric) :**
```bash
ffmpeg -i source.mp4 -an -c:v libx264 -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p -g 1 -movflags faststart+frag_keyframe+empty_moov \
  -crf 23 -vf "scale=1920:-2" heritage.mp4
```
> `-g 1` = keyframe à chaque frame → seek instantané et fluide.

## 📁 Structure de fichiers attendue

```
galerie-orfevres/
├── public/
│   ├── images/
│   │   ├── hero/        hero_1.jpg, hero_2.jpg
│   │   ├── about/       about1-7.jpg, histoire_vernissage.jpg
│   │   ├── contact/     demo_paint.png
│   │   └── icons/       icon_ig.png, icon_in.png, arrow.svg, arrow-right.svg
│   ├── videos/
│   │   └── heritage.mp4
│   └── wordmark-logo.svg, wordmark-logo-white.svg
├── src/
│   ├── components/
│   │   ├── Navigation.astro
│   │   ├── Hero.astro + HeroWebGL.ts
│   │   ├── Events.astro
│   │   ├── Gallery.astro
│   │   ├── ScrollVideo.astro + ScrollVideo.ts
│   │   ├── History.astro
│   │   ├── Stats.astro
│   │   ├── Services.astro
│   │   ├── Footer.astro
│   │   ├── ParticlesBackground.ts
│   │   └── CustomCursor.astro
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro          (redirect vers /fr)
│   │   ├── fr/{index,contact,legal}.astro
│   │   └── en/{index,contact,legal}.astro
│   ├── styles/global.css
│   ├── i18n/{fr,en}.json
│   └── lib/{lenis,gsap-config}.ts
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## 📝 Contenu textuel (FR)

- **H1 hero :** "Un Espace pour l'Art Audacieux et les Nouvelles Idées"
- **Section savoir-faire :** "La Galerie des orfèvres célèbre la brillance d'un savoir-faire rare."
- **Citation :** "Chaque exposition est un hommage au savoir-faire éternel."
- **Section heritage :** "Là où l'art, matériaux et temps deviennent héritage."
- **Histoire H2 :** "L'histoire de la galerie des orfèvres"
- **Histoire texte :** "Fondée par des artisans passionnés, la galerie des orfèvres présente des créations exceptionnelles. Chaque pièce raconte une histoire de dévouement, de tradition et d'excellence artistique qui s'étend sur les générations."
- **Stats :** 75+ Expositions Annuelles · 300+ Projets Collaboratifs · 300+ Œuvres Exposées · 30K+ Visiteurs Annuels
- **Services H2 :** "Ventes aux enchères · Conseils d'Experts · Expositions Organisées"

**Infos pratiques :**
- Adresse : 23 PLACE DAUPHINE, PARIS
- Horaires : Tous les jours 10h–18h
- Email : info@ruellanauction.com
- Instagram : @orfevres_galerie
- LinkedIn : galeriedesorfeveres

**EN :** traduire fidèlement, registre haut de gamme.

## ✅ Définition de "fini"

Une tâche n'est terminée que si :
1. Le code build sans erreur (`npm run build`)
2. Toutes les pages s'affichent en `npm run dev`
3. La vidéo scroll scrubbing fonctionne (vérifier avec une vidéo test)
4. Aucune erreur en console
5. Lighthouse audit lancé sur la home, score documenté
6. README à jour avec les instructions pour Cédric (FTP o2switch, encodage vidéo, placement des assets)
