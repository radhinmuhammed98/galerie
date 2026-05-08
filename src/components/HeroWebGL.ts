import * as THREE from 'three';
import { gsap } from 'gsap';

export function initHeroWebGL(container: HTMLElement, imageUrl: string) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    // Fallback simple image
    container.style.backgroundImage = `url(${imageUrl})`;
    container.style.backgroundSize = 'cover';
    container.style.backgroundPosition = 'center';
    return;
  }

  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 100);
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.offsetWidth, container.offsetHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const geometry = new THREE.PlaneGeometry(2, 2, 32, 32);

  const vertexShader = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uHover;
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Gentle wave effect
      float wave = sin(pos.x * 3.0 + uTime * 0.5) * 0.02;
      pos.z += wave + (uHover * sin(pos.y * 5.0 + uTime) * 0.05);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uTime;
    void main() {
      vec2 uv = vUv;
      
      // Slight RGB shift
      float r = texture2D(uTexture, uv + vec2(sin(uTime)*0.002, 0.0)).r;
      float g = texture2D(uTexture, uv).g;
      float b = texture2D(uTexture, uv - vec2(sin(uTime)*0.002, 0.0)).b;
      
      // Desaturate slightly to match Noir/Orfevre vibe
      vec3 color = vec3(r, g, b);
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(gray), 0.3);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const textureLoader = new THREE.TextureLoader();
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uHover: { value: 0 },
      uTexture: { value: null }
    },
    transparent: true
  });

  textureLoader.load(imageUrl, (texture) => {
    // Scale texture to cover the plane (simulate background-size: cover)
    const aspect = container.offsetWidth / container.offsetHeight;
    const imageAspect = texture.image.width / texture.image.height;
    
    if (aspect > imageAspect) {
      texture.repeat.set(1, imageAspect / aspect);
      texture.offset.set(0, (1 - imageAspect / aspect) / 2);
    } else {
      texture.repeat.set(aspect / imageAspect, 1);
      texture.offset.set((1 - aspect / imageAspect) / 2, 0);
    }
    
    material.uniforms.uTexture.value = texture;
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  });

  // Mouse interaction
  let mouseX = 0;
  let targetX = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetX = mouseX;
  });

  // Animation Loop
  const clock = new THREE.Clock();
  
  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    
    material.uniforms.uTime.value = elapsedTime;
    
    // Lerp hover value based on mouse movement
    material.uniforms.uHover.value = gsap.utils.interpolate(material.uniforms.uHover.value, Math.abs(targetX), 0.05);

    renderer.render(scene, camera);
  }
  
  animate();
}
