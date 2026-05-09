# Galerie des Orfèvres - Refonte Luxe Brut

Ce projet contient la refonte complète du site de la Galerie des Orfèvres.

## Stack Technique

- **Astro 4+** (Framework statique)
- **TailwindCSS v4** (Styling)
- **Three.js** (WebGL pour les effets d'ondulation et les particules)
- **GSAP 3 + ScrollTrigger** (Animations au défilement)
- **Lenis** (Smooth scroll)

## Instructions pour Cédric

### 1. Développement local

Pour lancer le projet en local :
```bash
npm install
npm run dev
```

### 2. Encodage Vidéo (Très Important)

La vidéo en arrière-plan (`heritage.mp4`) doit être encodée spécifiquement pour que le "scroll scrubbing" soit parfaitement fluide (un keyframe à chaque image).

Utilise cette commande ffmpeg :
```bash
ffmpeg -i source.mp4 -an -c:v libx264 -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p -g 1 -movflags faststart+frag_keyframe+empty_moov \
  -crf 23 -vf "scale=1920:-2" heritage.mp4
```

Place le fichier encodé dans le dossier `public/videos/heritage.mp4`.

### 3. Placement des Assets

- Les **images** du site sont dans `public/images/`. Les sous-dossiers (`about/`, `hero/`, `icons/`) structurent les ressources.
- Les **vidéos** sont dans `public/videos/`.
- Les logos SVG et autres ressources publiques sont à la racine de `public/`.

Toutes ces ressources seront automatiquement copiées dans le dossier final lors du build.

### 4. Déploiement sur o2switch (FTP)

Le site doit être hébergé de manière entièrement statique, ce qui est parfait pour l'hébergement o2switch.

1. Construis la version de production :
```bash
npm run build
```

2. Cela va générer un dossier `dist/`.
3. Prends tout le contenu à l'intérieur du dossier `dist/` (pas le dossier `dist` lui-même, juste son contenu).
4. Via FTP (FileZilla ou autre) ou via le cPanel o2switch, dépose ces fichiers à la racine de ton hébergement web (souvent `/public_html/`).

C'est terminé !

### Architecture

```
src/
├── components/       # Modules de l'interface (Hero, Gallery, ScrollVideo...)
├── i18n/             # Traductions FR/EN (fr.json, en.json)
├── layouts/          # Layout principal (BaseLayout.astro)
├── lib/              # Configuration GSAP et Lenis
├── pages/            # Les pages Astro (/fr, /en)
└── styles/           # Styles globaux (global.css)
```
"# galerie-1" 
"# galerie-1" 
