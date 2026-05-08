import * as THREE from 'three';

interface ParticleOptions {
  count?: number;
}

/**
 * Particules dorées 3D légères. Boucle d'animation suspendue quand hors viewport
 * pour éviter de doubler le coût GPU avec plusieurs instances simultanées.
 */
export function initParticles(container: HTMLElement, options: ParticleOptions = {}) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const isMobile = window.innerWidth <= 768;
  // Moins de particules, plus discrètes (philosophie luxe : "l'absence est une présence")
  const particleCount = options.count ?? (isMobile ? 40 : 80);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.offsetWidth / container.offsetHeight, 1, 1000);
  camera.position.z = 100;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '0';
  renderer.domElement.style.pointerEvents = 'none';

  container.appendChild(renderer.domElement);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities: { x: number; y: number }[] = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    velocities.push({
      y: Math.random() * 0.1 + 0.02,
      x: (Math.random() - 0.5) * 0.05,
    });
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xD4B886, // or-clair (plus subtil que or-fonce)
    size: 1.4,
    transparent: true,
    opacity: 0.15,   // discret, conformément à l'esthétique luxe
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  const handleResize = () => {
    if (!container.offsetWidth || !container.offsetHeight) return;
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  };
  window.addEventListener('resize', handleResize);

  // Pause le rendu quand le conteneur est hors viewport (perf)
  let isVisible = true;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { isVisible = e.isIntersecting; }),
    { threshold: 0 }
  );
  io.observe(container);

  let rafId = 0;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    if (!isVisible) return;

    const arr = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3 + 1] += velocities[i].y;
      arr[i * 3]     += velocities[i].x;
      if (arr[i * 3 + 1] > 150) {
        arr[i * 3 + 1] = -150;
        arr[i * 3]     = (Math.random() - 0.5) * 300;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.0005;
    renderer.render(scene, camera);
  };
  animate();

  // Cleanup hook (optionnel) si jamais le conteneur est retiré du DOM
  return () => {
    cancelAnimationFrame(rafId);
    io.disconnect();
    window.removeEventListener('resize', handleResize);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}
