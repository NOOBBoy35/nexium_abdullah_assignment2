'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Navbar from "./Navbar";

interface ThreeSceneProps {
  onSubmit: (data: { mode: string, value: string }) => void;
  loading: boolean;
  summary?: string;
  urduSummary?: string;
  error?: string;
}

// Typing effect hook
function useTypewriter(text: string, enabled: boolean, speed: number = 18) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!enabled) {
      setDisplayed('');
      return;
    }
    setDisplayed('');
    let i = 0;
    let cancelled = false;
    function type() {
      if (cancelled) return;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        setTimeout(type, speed);
      }
    }
    type();
    return () => { cancelled = true; };
  }, [text, enabled, speed]);
  return displayed;
}

// Helper to get first N lines of a string
function getFirstLines(text: string, n: number) {
  if (!text) return '';
  const lines = text.split(/(?<=[.!?])\s+/g); // split by sentences
  return lines.slice(0, n).join(' ');
}

export default function ThreeScene({ onSubmit, loading, summary, urduSummary, error }: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<'text'|'url'>('text');
  const [url, setUrl] = useState('');
  const [isNight, setIsNight] = useState(() => {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 18;
  });

  // Add state to control minimized input panel
  const showSummary = !!(summary && urduSummary && !loading);
  const [inputMinimized, setInputMinimized] = useState(false);
  // Typing effect for summary/translation
  const [startTyping, setStartTyping] = useState(false);
  const typedSummary = useTypewriter(summary || '', showSummary && startTyping, 16);
  const typedUrdu = useTypewriter(urduSummary || '', showSummary && startTyping, 22);
  // Copy feedback state
  const [copied, setCopied] = useState<'none'|'en'|'ur'>('none');
  // Expand/collapse state for both summary and urdu
  const [expandBoth, setExpandBoth] = useState(false);
  const handleCopy = (text: string, which: 'en'|'ur') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied('none'), 1500);
  };
  // Fade out summary/translation box
  const [fadeOut, setFadeOut] = useState(false);
  const handleCloseSummary = () => {
    setFadeOut(true);
    setTimeout(() => {
      setFadeOut(false);
      setStartTyping(false);
      setInputMinimized(false);
      setCopied('none');
      setText('');
      // Clear summaries so the box is hidden until new text is provided
      if (typeof window !== 'undefined') {
        // If parent manages summary/urduSummary, notify parent to clear them
        const event = new CustomEvent('clearSummaries');
        window.dispatchEvent(event);
      }
      if (typeof window !== 'undefined') {
        // Scroll to input panel if needed
        const inputPanel = document.getElementById('input-panel');
        if (inputPanel) inputPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400);
  };

  // Animate input panel when summary is ready
  useEffect(() => {
    if (showSummary) {
      setInputMinimized(true);
      // Delay typing effect until minimized
      setTimeout(() => setStartTyping(true), 500);
      // Scroll summary panel into view when typing starts
      setTimeout(() => {
        if (summaryRef.current) {
          summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 700);
    } else {
      setInputMinimized(false);
      setStartTyping(false);
    }
  }, [showSummary]);

  // Handle theme toggle
  const handleToggleTheme = () => setIsNight((prev: boolean) => !prev);

  // --- Shooting Star (Night Only, On Click) ---
  const shootingStars: { sprite: THREE.Sprite, start: number, duration: number, vx: number, vy: number, lastElapsed: number, glowSprite?: THREE.Sprite }[] = [];
  function spawnShootingStar(startX?: number, startY?: number) {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    // Create a streak texture
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Draw streak from left (tail) to right (head)
    const grad = ctx.createLinearGradient(0, size/2, size, size/2);
    grad.addColorStop(0, 'rgba(180,220,255,0)'); // tail (left)
    grad.addColorStop(0.3, 'rgba(180,220,255,0.18)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,1)'); // head (right)
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(size/2, size/2, size*0.45, size*0.13, 0, 0, Math.PI*2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    // Determine start position
    let worldX = -7;
    let worldY = Math.random() * 4.5 + 0.5;
    const worldZ = -2.1;
    if (typeof startX === 'number' && typeof startY === 'number') {
      // Convert screen (client) coordinates to normalized device coordinates (-1 to 1)
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const ndcX = ((startX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((startY - rect.top) / rect.height) * 2 - 1);
      // Raycast from camera through click point to z = -2.1 plane
      const camera = cameraRef.current;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const t = (worldZ - camera.position.z) / raycaster.ray.direction.z;
      const intersection = new THREE.Vector3().copy(raycaster.ray.direction).multiplyScalar(t).add(camera.position);
      worldX = intersection.x;
      worldY = intersection.y;
    }
    sprite.position.set(worldX, worldY, worldZ);
    sprite.scale.set(2.2, 0.28, 1); // slimmer shooting star
    sprite.material.opacity = 0; // Start fully transparent for fade-in
    // Calculate angle for velocity
    const vx = 4.2 / 1000;
    const vy = (Math.random() - 0.5) * 0.0025;
    // Rotate sprite to match movement direction
    sprite.material.rotation = Math.atan2(vy, vx);
    sceneRef.current.add(sprite);
    shootingStars.push({
      sprite,
      start: performance.now(),
      duration: 2000 + Math.random() * 600, // slightly shorter duration
      vx,
      vy,
      lastElapsed: 0,
      glowSprite: undefined
    });
  }

  // Helper to create a glow sprite
  function createStarGlowSprite() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,220,0.95)');
    gradient.addColorStop(0.3, 'rgba(255,255,180,0.55)');
    gradient.addColorStop(0.7, 'rgba(255,220,120,0.18)');
    gradient.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.7, 1.1, 1); // slimmer glow
    sprite.material.opacity = 0;
    return sprite;
  }

  // --- Interactive Bubbles (Day Only, On Click) ---
  const interactiveBubbles: { sprite: THREE.Sprite, state: 'growing'|'normal'|'popping', growStart: number, popStart: number, maxSize: number, baseY: number, position: THREE.Vector3 }[] = [];
  function spawnInteractiveBubble(startX: number, startY: number) {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    // Use the same color palette and texture as background bubbles
    const colorChoices: [number, number, number][] = [
      [180,220,255], [255,200,240], [200,255,220], [255,255,200], [220,200,255]
    ];
    const rgb = colorChoices[Math.floor(Math.random() * colorChoices.length)];
    const texture = createBubbleTexture(rgb);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      opacity: 0.0, // start invisible for grow-in
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    // Convert click to world coordinates at z = -2.1
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const ndcX = ((startX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((startY - rect.top) / rect.height) * 2 - 1);
    const camera = cameraRef.current;
    const raycaster = new THREE.Raycaster();
    const worldZ = -2.1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const t = (worldZ - camera.position.z) / raycaster.ray.direction.z;
    const intersection = new THREE.Vector3().copy(raycaster.ray.direction).multiplyScalar(t).add(camera.position);
    sprite.position.copy(intersection);
    sprite.scale.set(0, 0, 1); // start invisible
    sprite.material.opacity = 0.0;
    sceneRef.current.add(sprite);
    interactiveBubbles.push({
      sprite,
      state: 'growing',
      growStart: performance.now(),
      popStart: 0,
      maxSize: Math.random() * 0.85 + 0.65, // match background bubble size
      baseY: intersection.y,
      position: intersection.clone()
    });
  }

  // Helper to create a soft bokeh/dust texture
  function createBokehTexture(rgb: [number, number, number], size: number = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    gradient.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.25)`);
    gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }
  // Helper to create a glowing plus-shaped star texture
  function createPlusStarTexture(rgb: [number, number, number], size: number = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    // Draw glow
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.7)`);
    gradient.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.15)`);
    gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    // Draw plus shape
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`;
    ctx.lineWidth = size * 0.13;
    ctx.beginPath();
    ctx.moveTo(size/2, size*0.18);
    ctx.lineTo(size/2, size*0.82);
    ctx.moveTo(size*0.18, size/2);
    ctx.lineTo(size*0.82, size/2);
    ctx.stroke();
    ctx.restore();
    return new THREE.CanvasTexture(canvas);
  }
  // Helper to create a realistic shiny bubble texture
  function createBubbleTexture(rgb: [number, number, number], size: number = 128) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // Bubble base: radial gradient
    const gradient = ctx.createRadialGradient(size/2, size/2, size*0.1, size/2, size/2, size/2);
    gradient.addColorStop(0, `rgba(255,255,255,0.45)`);
    gradient.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.22)`);
    gradient.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.10)`);
    gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.fill();
    // Iridescent edge
    const iridescent = ctx.createRadialGradient(size/2, size/2, size*0.7, size/2, size/2, size/2);
    iridescent.addColorStop(0, 'rgba(255,255,255,0)');
    iridescent.addColorStop(0.7, 'rgba(180,220,255,0.10)');
    iridescent.addColorStop(1, 'rgba(255,180,255,0.18)');
    ctx.fillStyle = iridescent;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
    ctx.fill();
    // White highlight (shine)
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(size*0.38, size*0.32, size*0.13, size*0.07, -0.5, 0, Math.PI*2);
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = size*0.04;
    ctx.fill();
    ctx.restore();
    return new THREE.CanvasTexture(canvas);
  }

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // --- Shooting Star Click Handler ---
    mountRef.current.addEventListener('click', (e: MouseEvent) => {
      if (isNight) {
        spawnShootingStar(e.clientX, e.clientY);
      } else {
        spawnInteractiveBubble(e.clientX, e.clientY);
      }
    });

    // --- Dynamic Sky ---
    // Create a large sphere for the sky
    const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: null,
      color: isNight ? 0x0a0a40 : 0x87ceeb,
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Helper to create a radial gradient sprite for glow
    function createGlowSprite(rgb: [number, number, number], size: number, opacity: number) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      gradient.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.4)`);
      gradient.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = opacity;
      ctx.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(size, size, 1);
      return sprite;
    }

    let celestial: THREE.Group | null = null;
    // Make sun/moon bigger, more round, and move further top left
    const celestialPosition = new THREE.Vector3(-7, 3.2, -2.5); // Move further left
    const cubeSize = 0.22; // Slightly smaller cubes for more detail
    if (isNight) {
      // Pixelated moon (group of cubes)
      celestial = new THREE.Group();
      // Add moon glow (sprite-based, soft blue-white)
      const moonGlow = createGlowSprite([191,220,255], 4.6, 0.7); // match sun's outer glow size
      moonGlow.position.set(0, 0, -0.2);
      celestial.add(moonGlow);
      // Add a second, more intense mid glow for the moon
      const moonMidGlow = createGlowSprite([220,235,255], 3.2, 0.5); // match sun's mid glow size
      moonMidGlow.position.set(0, 0, -0.15);
      celestial.add(moonMidGlow);
      // Add a small, white core glow for the moon
      const moonCoreGlow = createGlowSprite([255,255,255], 1.7, 0.35); // match sun's core glow size
      moonCoreGlow.position.set(0, 0, -0.1);
      celestial.add(moonCoreGlow);
      const moonGridRadius = 4; // match sun's grid radius
      const moonCubeSize = 0.28; // match sun's cube size
      for (let y = -moonGridRadius; y <= moonGridRadius; y++) {
        for (let x = -moonGridRadius; x <= moonGridRadius; x++) {
          // Use a more circular mask for roundness
          if ((x * x + y * y) <= (moonGridRadius + 0.2) * (moonGridRadius + 0.2)) {
            const cube = new THREE.Mesh(
              new THREE.BoxGeometry(moonCubeSize, moonCubeSize, moonCubeSize),
              new THREE.MeshStandardMaterial({ color: 0xfafaff, roughness: 0.7, metalness: 0.2 })
            );
            cube.position.set(x * moonCubeSize, y * moonCubeSize, 0);
            celestial.add(cube);
          }
        }
      }
      // Add a few "craters" (darker cubes)
      for (let i = 0; i < 4; i++) {
        const crater = new THREE.Mesh(
          new THREE.BoxGeometry(moonCubeSize * 0.7, moonCubeSize * 0.7, moonCubeSize * 0.7),
          new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.8 })
        );
        crater.position.set(
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.2,
          0.1 + Math.random() * 0.2
        );
        celestial.add(crater);
      }
      celestial.position.copy(celestialPosition);
    } else {
      // Pixelated sun (group of cubes)
      celestial = new THREE.Group();
      // Add sun glow (sprite-based, vibrant gradient)
      // First, a large, warm orange/yellow glow
      const sunOuterGlow = createGlowSprite([255, 180, 40], 4.6, 0.7); // larger orange-yellow
      sunOuterGlow.position.set(0, 0, -0.25);
      celestial.add(sunOuterGlow);
      // Second, a medium, saturated yellow glow
      const sunMidGlow = createGlowSprite([255, 220, 60], 3.2, 0.8); // larger vibrant yellow
      sunMidGlow.position.set(0, 0, -0.2);
      celestial.add(sunMidGlow);
      // Third, a small, white-hot core glow
      const sunCoreGlow = createGlowSprite([255, 255, 220], 1.7, 0.95); // larger white-hot
      sunCoreGlow.position.set(0, 0, -0.15);
      celestial.add(sunCoreGlow);
      const sunGridRadius = 4; // bigger sun body
      const sunCubeSize = 0.28; // bigger cubes
      for (let y = -sunGridRadius; y <= sunGridRadius; y++) {
        for (let x = -sunGridRadius; x <= sunGridRadius; x++) {
          if ((x * x + y * y) <= (sunGridRadius + 0.2) * (sunGridRadius + 0.2)) {
            const cube = new THREE.Mesh(
              new THREE.BoxGeometry(sunCubeSize, sunCubeSize, sunCubeSize),
              new THREE.MeshStandardMaterial({ 
                color: 0xffb300, // vibrant yellow-orange
                emissive: 0xffe066, // keep a bright yellow emissive
                emissiveIntensity: 1.2, // more glow
                roughness: 0.35,
                metalness: 0.25
              })
            );
            cube.position.set(x * sunCubeSize, y * sunCubeSize, 0);
            celestial.add(cube);
          }
        }
      }
      celestial.position.copy(celestialPosition);
    }
    if (celestial) scene.add(celestial);

    // --- Pixelated 3D Clouds (unique, recycled, animated fade) ---
    const cloudColorsDay = [0xffffff]; // pure white only for day clouds
    const cloudColorsNight = [0xcccccc, 0x444444]; // light gray, dark gray
    const clouds: { group: THREE.Group, pattern: number[][], state: 'normal'|'fadingOut'|'fadingIn', fadeStart: number, baseOpacity: number }[] = [];
    const numClouds = 12; // 12 clouds for both day and night
    // Library of 12 unique, hand-crafted pixel cloud patterns
    const cloudPatterns = [
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,1,1,1,1]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,1]
      ],
      [
        [1,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,1]
      ],
      [
        [1,1,1,0,0],
        [1,1,1,1,0],
        [0,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,1]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0]
      ],
      [
        [1,1,1,1,0],
        [1,1,1,1,1],
        [0,1,1,1,0]
      ],
      [
        [0,1,1,1,0],
        [1,1,1,1,1],
        [1,1,1,1,1]
      ]
    ];
    // Helper to build a cloud group from a pattern
    function buildCloud(pattern: number[][], colorArray: number[], opacity: number, isNight: boolean) {
      const group = new THREE.Group();
      const cubeSize = 0.5;
      const dayOpacity = opacity; // always use the passed-in opacity (0.75 for day)
      for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[0].length; x++) {
          if (pattern[y][x]) {
            const color = isNight ? colorArray[0] : colorArray[Math.floor(Math.random() * colorArray.length)];
            let material;
            if (isNight) {
              material = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.7,
                transparent: true,
                opacity,
              });
            } else {
              material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: dayOpacity,
              });
            }
            const cube = new THREE.Mesh(
              new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
              material
            );
            cube.position.set(x * cubeSize, y * cubeSize, 0);
            group.add(cube);
            // Add outline for day clouds
            if (!isNight) {
              const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, side: THREE.BackSide });
              const outline = new THREE.Mesh(
                new THREE.BoxGeometry(cubeSize * 1.08, cubeSize * 1.08, cubeSize * 1.08),
                outlineMaterial
              );
              outline.position.copy(cube.position);
              group.add(outline);
            }
          }
        }
      }
      return group;
    }
    // Helper to build a cloud group from a pattern
    function shufflePatterns(patterns: number[][][]) {
      const arr = [...patterns];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    let patternPool = shufflePatterns(cloudPatterns);
    for (let i = 0; i < numClouds; i++) {
      const colorArray = isNight ? cloudColorsNight : cloudColorsDay;
      const baseOpacity = isNight ? 0.55 : 0.75;
      // Assign a unique pattern to each cloud
      if (patternPool.length === 0) patternPool = shufflePatterns(cloudPatterns);
      const pattern = patternPool.pop()!;
      // For day, always use pure white and MeshBasicMaterial
      const cloud = buildCloud(pattern, isNight ? colorArray : [0xffffff], baseOpacity, isNight);
      // Spread clouds evenly with some random offset
      const spread = 12;
      const baseX = -6 + (i * spread) / (numClouds - 1);
      const jitter = (Math.random() - 0.5) * 1.2;
      cloud.position.set(
        baseX + jitter,
        1.2 + Math.random() * 2.5,
        -2.5 + Math.random() * 1.5
      );
      scene.add(cloud);
      clouds.push({ group: cloud, pattern, state: 'normal', fadeStart: 0, baseOpacity });
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(isNight ? 0x222244 : 0x404040, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(isNight ? 0xccccff : 0xffffff, 0.7);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // --- END Dynamic Sky ---

    // Create summary cards
    const createSummaryCard = (text: string, position: THREE.Vector3, color: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 256;

      // Background
      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Text
      context.fillStyle = '#ffffff';
      context.font = '24px Arial';
      context.textAlign = 'center';
      
      const words = text.split(' ');
      let line = '';
      let y = 50;
      
             for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = context.measureText(testLine);
        
        if (metrics.width > canvas.width - 40) {
          context.fillText(line, canvas.width / 2, y);
          line = word + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, canvas.width / 2, y);

      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry(3, 1.5);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const card = new THREE.Mesh(geometry, material);
      card.position.copy(position);
      card.visible = false;
      
      return card;
    };

    const englishCard = createSummaryCard(
      summary || 'English summary will appear here...',
      new THREE.Vector3(-2, 0, 0),
      0x2c3e50
    );
    scene.add(englishCard);

    const urduCard = createSummaryCard(
      urduSummary || 'اردو کا خلاصہ یہاں ظاہر ہوگا...',
      new THREE.Vector3(2, 0, 0),
      0x8e44ad
    );
    scene.add(urduCard);

    // --- 3D Card Carousel for Summaries ---
    // Carousel group
    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);
    // Helper to create a card
    const createCarouselCard = (text: string, color: number) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 256;
      context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fff';
      context.font = '24px Arial';
      context.textAlign = 'center';
      const words = text.split(' ');
      let line = '';
      let y = 50;
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > canvas.width - 40) {
          context.fillText(line, canvas.width / 2, y);
          line = word + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, canvas.width / 2, y);
      const texture = new THREE.CanvasTexture(canvas);
      const geometry = new THREE.PlaneGeometry(3, 1.5);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const card = new THREE.Mesh(geometry, material);
      card.visible = false;
      return card;
    };
    // Add cards to carousel
    const cards = [
      createCarouselCard(summary || 'English summary will appear here...', 0x2c3e50),
      createCarouselCard(urduSummary || 'اردو کا خلاصہ یہاں ظاہر ہوگا...', 0x8e44ad),
    ];
    cards.forEach((card, i) => {
      const angle = (i / cards.length) * Math.PI * 2;
      card.position.set(Math.cos(angle) * 3.5, 0.2, Math.sin(angle) * 3.5);
      card.lookAt(0, 0.7, 0);
      carouselGroup.add(card);
    });
    // --- Particle/Confetti Effects ---
    let confettiParticles: THREE.Points | null = null;
    const createConfetti = () => {
      if (confettiParticles) scene.remove(confettiParticles);
      const confettiGeometry = new THREE.BufferGeometry();
      const confettiCount = 120;
      const confettiPositions = new Float32Array(confettiCount * 3);
      for (let i = 0; i < confettiCount; i++) {
        confettiPositions[i * 3] = (Math.random() - 0.5) * 2;
        confettiPositions[i * 3 + 1] = Math.random() * 2 + 1.2;
        confettiPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
      confettiGeometry.setAttribute('position', new THREE.BufferAttribute(confettiPositions, 3));
      const confettiMaterial = new THREE.PointsMaterial({ size: 0.08, color: 0xffffff, vertexColors: false });
      confettiParticles = new THREE.Points(confettiGeometry, confettiMaterial);
      scene.add(confettiParticles);
    };

    // --- Soft Particle Effects (Bokeh/Stars/Orbs) ---
    let particlesGroup: THREE.Group | null = null;
    let particleData: { sprite: THREE.Sprite, speed?: number, bandY?: number, bandZ?: number, type?: string, offset?: number, orb?: boolean }[] = [];
    const orbCount = isNight ? 5 : 0;
    function createParticles() {
      if (particlesGroup) scene.remove(particlesGroup);
      particlesGroup = new THREE.Group();
      particleData = [];
      // Day: dust and bokeh under input box (as before)
      if (!isNight) {
        // Dust: brown, small, more numerous
        const dustCount = 36;
        for (let i = 0; i < dustCount; i++) {
          const size = Math.random() * 0.09 + 0.06;
          const rgb: [number, number, number] = [186, 153, 110]; // soft brown
          const texture = createBokehTexture(rgb);
          const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            opacity: Math.random() * 0.13 + 0.08,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const sprite = new THREE.Sprite(material);
          sprite.position.set(
            (Math.random() - 0.5) * 7.5,
            -1.2 - Math.random() * 1.0, // y = -1.2 to -2.2
            -2.1 + Math.random() * 0.2
          );
          sprite.scale.set(size, size, 1);
          particlesGroup.add(sprite);
          // Each dust particle moves rightward at a constant speed
          particleData.push({
            sprite,
            speed: 0.008 + Math.random() * 0.004,
            bandY: sprite.position.y,
            bandZ: sprite.position.z,
            type: 'dust',
            offset: Math.random() * 1000,
          });
        }
        // Bokeh: yellow, larger, fewer
        const bokehCount = 12;
        for (let i = 0; i < bokehCount; i++) {
          const size = Math.random() * 0.22 + 0.13;
          const rgb: [number, number, number] = [255, 230, 120]; // soft yellow
          const texture = createBokehTexture(rgb);
          const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            opacity: Math.random() * 0.18 + 0.18,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const sprite = new THREE.Sprite(material);
          sprite.position.set(
            (Math.random() - 0.5) * 7.5,
            -1.2 - Math.random() * 1.0, // y = -1.2 to -2.2
            -2.15 + Math.random() * 0.15
          );
          sprite.scale.set(size, size, 1);
          particlesGroup.add(sprite);
          // Each bokeh particle moves rightward at a constant speed
          particleData.push({
            sprite,
            speed: 0.012 + Math.random() * 0.006,
            bandY: sprite.position.y,
            bandZ: sprite.position.z,
            type: 'bokeh',
            offset: Math.random() * 1000,
          });
        }
      } else {
        // Night: small, glowing, plus-shaped stars (many, stay still)
        const starCount = 220;
        const colorChoices: [number, number, number][] = [
          [255,255,255], [191,220,255], [224,231,255], [200,224,255]
        ];
        // Moon exclusion zone (match moon's position and size)
        const moonCenter = { x: -7, y: 3.2 };
        const moonRadius = 1.7; // slightly larger than moon body
        let placed = 0, attempts = 0;
        while (placed < starCount && attempts < starCount * 10) {
          attempts++;
          const size = Math.random() * 0.09 + 0.045; // small
          const rgb = colorChoices[Math.floor(Math.random() * colorChoices.length)];
          const texture = createPlusStarTexture(rgb);
          const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            opacity: 0.85,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          // Spread stars across the whole screen, including bottom
          const x = (Math.random() - 0.5) * 16; // wider than before
          const y = Math.random() * 11 - 5.5;   // much taller: covers from -5.5 to +5.5
          // Exclude region around the moon
          const distToMoon = Math.sqrt((x - moonCenter.x) ** 2 + (y - moonCenter.y) ** 2);
          if (distToMoon < moonRadius) continue;
          const sprite = new THREE.Sprite(material);
          sprite.position.set(x, y, -2.2 + Math.random() * 0.5);
          sprite.scale.set(size, size, 1);
          particlesGroup.add(sprite);
          particleData.push({
            sprite,
            type: 'star',
          });
          placed++;
        }
        // Night: glowing orbs (leave as before)
        for (let i = 0; i < orbCount; i++) {
          const size = Math.random() * 0.7 + 0.45;
          const colorChoices = [0xbfdcff, 0xffffff, 0xe0e7ff];
          const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
          const material = new THREE.SpriteMaterial({
            color,
            opacity: 0.18 + Math.random() * 0.13,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });
          const sprite = new THREE.Sprite(material);
          sprite.position.set(
            (Math.random() - 0.5) * 13,
            Math.random() * 6 - 1.5,
            -2.3 + Math.random() * 0.2
          );
          sprite.scale.set(size, size, 1);
          particlesGroup.add(sprite);
          particleData.push({
            sprite,
            orb: true,
          });
        }
      }
      scene.add(particlesGroup);
    }
    createParticles();

    // --- Bubbles/Blobs ---
    let bubblesGroup: THREE.Group | null = null;
    let bubbleData: { sprite: THREE.Sprite, baseY: number, speedX: number, size: number, state: string, growStart: number, popStart: number }[] = [];
    // --- Bubble Pop Splash Particles ---
    const popParticles: { sprite: THREE.Sprite, vx: number, vy: number, start: number, duration: number }[] = [];
    function spawnPopParticles(x: number, y: number, z: number) {
      const count = 4 + Math.floor(Math.random() * 4); // 4-7 particles
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.06 + Math.random() * 0.04;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = Math.random() * 0.11 + 0.07;
        const colorChoices: [number, number, number][] = [
          [255,255,255], [255,230,200], [200,220,255], [255,200,240]
        ];
        const rgb = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        const texture = createBokehTexture(rgb, 32);
        const material = new THREE.SpriteMaterial({
          map: texture,
          color: 0xffffff,
          opacity: 0.85,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(size, size, 1);
        if (bubblesGroup) bubblesGroup.add(sprite);
        popParticles.push({ sprite, vx, vy, start: performance.now(), duration: 260 + Math.random() * 80 });
      }
    }
    function createBubbles() {
      if (bubblesGroup) scene.remove(bubblesGroup);
      bubblesGroup = new THREE.Group();
      bubbleData = [];
      const bubbleCount = 4 + Math.floor(Math.random() * 3); // 4-6 bubbles
      const colorChoices: [number, number, number][] = [
        [180,220,255], [255,200,240], [200,255,220], [255,255,200], [220,200,255]
      ];
      for (let i = 0; i < bubbleCount; i++) {
        const rgb = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        const texture = createBubbleTexture(rgb);
        const size = Math.random() * 0.85 + 0.65;
        const material = new THREE.SpriteMaterial({
          map: texture,
          color: 0xffffff,
          opacity: 0.0, // start invisible for grow-in
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(material);
        // Place bubbles in a horizontal band near the bottom
        const x = (Math.random() - 0.5) * 10;
        const y = -3.8 + Math.random() * 1.6; // y = -3.8 to -2.2 (bottom band)
        sprite.position.set(x, y, -2.0 + Math.random() * 0.5);
        sprite.scale.set(0, 0, 1); // start at zero scale
        bubblesGroup.add(sprite);
        bubbleData.push({
          sprite,
          baseY: y,
          speedX: 0.008 + Math.random() * 0.006,
          size,
          state: 'growing', // 'growing', 'normal', or 'popping'
          growStart: performance.now(),
          popStart: 0,
        });
      }
      scene.add(bubblesGroup);
    }
    createBubbles();

    // --- Sun Rays (Day Only) ---
    let sunRays: THREE.Sprite | null = null;
    function createSunRays() {
      if (sunRays) scene.remove(sunRays);
      // Create a radial rays texture
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, size, size);
      // Draw radial rays
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        ctx.save();
        ctx.translate(size/2, size/2);
        ctx.rotate(angle);
        const grad = ctx.createLinearGradient(0, 0, 0, -size/2);
        grad.addColorStop(0, 'rgba(255,255,200,0.18)');
        grad.addColorStop(0.5, 'rgba(255,255,200,0.08)');
        grad.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size/2);
        ctx.lineWidth = 8 + Math.random() * 6;
        ctx.globalAlpha = 0.7;
        ctx.stroke();
        ctx.restore();
      }
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      sunRays = new THREE.Sprite(material);
      sunRays.scale.set(7.5, 7.5, 1);
      sunRays.position.copy(new THREE.Vector3(-7, 3.2, -2.7));
      scene.add(sunRays);
    }
    if (!isNight) createSunRays();

    // --- Sun/Moon Shimmer ---
    let shimmerSprite: THREE.Sprite | null = null;
    let shimmerActive = false;
    let shimmerStart = 0;
    function createShimmer(isSun: boolean) {
      if (shimmerSprite) scene.remove(shimmerSprite);
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, size, size);
      // Draw a white arc (shimmer)
      ctx.save();
      ctx.translate(size/2, size/2);
      ctx.rotate(-0.3);
      ctx.beginPath();
      ctx.arc(0, 0, size/2.2, 0.2, 1.1);
      ctx.lineWidth = 10;
      ctx.strokeStyle = isSun ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.33)';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
      ctx.restore();
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      shimmerSprite = new THREE.Sprite(material);
      shimmerSprite.scale.set(2.2, 2.2, 1);
      shimmerSprite.position.copy(new THREE.Vector3(-7, 3.2, -2.3));
      scene.add(shimmerSprite);
      shimmerActive = true;
      shimmerStart = performance.now();
    }

    // Animation loop (add particle animation)
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      if (celestial) celestial.rotation.z += 0.002;
      // Animate particles
      if (particlesGroup) {
        for (let i = 0; i < particleData.length; i++) {
          const p = particleData[i];
          if (!isNight) {
            // Day: move rightward, slight vertical drift
            p.sprite.position.x += typeof p.speed === 'number' ? p.speed : 0;
            // Wrap around horizontally
            if (p.sprite.position.x > 4.2) {
              p.sprite.position.x = -4.2;
              // Randomize y and z within band
              p.sprite.position.y = -1.2 - Math.random() * 1.0;
              p.sprite.position.z = p.bandZ;
            }
            // Add a little vertical drift for bokeh
            if (p.type === 'bokeh') {
              const bandY = typeof p.bandY === 'number' ? p.bandY : 0;
              const offset = typeof p.offset === 'number' ? p.offset : 0;
              p.sprite.position.y = bandY + Math.sin(performance.now() * 0.0003 + offset) * 0.13;
            }
          } else {
            // Night: only animate orbs (not stars)
            if (p.orb) {
              const t = now * 0.00012;
              p.sprite.position.y += Math.sin(t) * 0.01;
              p.sprite.position.x += Math.cos(t) * 0.01;
            }
            // Remove any moving or non-plus-shaped artifacts (should only be plus-shaped stars and orbs)
            if (p.type !== 'star' && !p.orb) {
              if (particlesGroup && p.sprite) particlesGroup.remove(p.sprite);
            }
          }
        }
      }
      // Animate clouds drifting slowly to the right, wrap around and randomize pattern
      clouds.forEach((cloudObj, idx) => {
        const cloud = cloudObj.group;
        // Animate cloud movement
        if (cloudObj.state === 'normal') {
          cloud.position.x += 0.002 + idx * 0.0007;
          if (cloud.position.x > 8) {
            cloudObj.state = 'fadingOut';
            cloudObj.fadeStart = now;
          }
        }
        // Fade out
        if (cloudObj.state === 'fadingOut') {
          const elapsed = (now - cloudObj.fadeStart) / 1000;
          const fade = Math.max(0, 1 - elapsed / 3);
          cloud.children.forEach((cube) => {
            if ((cube as THREE.Mesh).material) {
              ((cube as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = fade * cloudObj.baseOpacity;
            }
          });
          cloud.position.x += 0.002 + idx * 0.0007;
          if (fade <= 0) {
            // Reposition and assign a new unique pattern
            cloud.position.x = -8;
            while (cloud.children.length) cloud.remove(cloud.children[0]);
            const colorArray = isNight ? cloudColorsNight : cloudColorsDay;
            const baseOpacity = isNight ? 0.55 : 0.75;
            // Pick a new pattern different from the last
            if (patternPool.length === 0) patternPool = shufflePatterns(cloudPatterns);
            let newPattern = patternPool.pop()!;
            while (JSON.stringify(newPattern) === JSON.stringify(cloudObj.pattern) && patternPool.length > 0) {
              patternPool.unshift(newPattern);
              newPattern = patternPool.pop()!;
            }
            for (let y = 0; y < newPattern.length; y++) {
              for (let x = 0; x < newPattern[0].length; x++) {
                if (newPattern[y][x]) {
                  const color = isNight ? colorArray[0] : colorArray[Math.floor(Math.random() * colorArray.length)];
                  let material;
                  if (isNight) {
                    material = new THREE.MeshStandardMaterial({
                      color,
                      roughness: 0.7,
                      transparent: true,
                      opacity: 0,
                    });
                  } else {
                    material = new THREE.MeshBasicMaterial({
                      color,
                      transparent: true,
                      opacity: 0,
                    });
                  }
                  const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.38, 0.38, 0.38),
                    material
                  );
                  cube.position.set(x * 0.38, y * 0.38, 0);
                  cloud.add(cube);
                  // Add outline for day clouds
                  if (!isNight) {
                    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, side: THREE.BackSide });
                    const outline = new THREE.Mesh(
                      new THREE.BoxGeometry(cubeSize * 1.08, cubeSize * 1.08, cubeSize * 1.08),
                      outlineMaterial
                    );
                    outline.position.copy(cube.position);
                    cloud.add(outline);
                  }
                }
              }
            }
            cloudObj.pattern = newPattern;
            cloudObj.state = 'fadingIn';
            cloudObj.fadeStart = now;
            cloudObj.baseOpacity = baseOpacity;
          }
        }
        // Fade in
        if (cloudObj.state === 'fadingIn') {
          const elapsed = (now - cloudObj.fadeStart) / 1000;
          const fade = Math.min(1, elapsed / 3);
          cloud.children.forEach((cube) => {
            if ((cube as THREE.Mesh).material) {
              ((cube as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = fade * cloudObj.baseOpacity;
            }
          });
          cloud.position.x += 0.002 + idx * 0.0007;
          if (fade >= 1) {
            cloudObj.state = 'normal';
          }
        }
      });
      // In the animation loop, animate bubbles and pop particles
      if (bubblesGroup) {
        for (let i = 0; i < bubbleData.length; i++) {
          const b = bubbleData[i];
          if (b.state === 'growing') {
            // Grow-in animation
            const growDuration = 180;
            const elapsed = performance.now() - b.growStart;
            const t = Math.min(1, elapsed / growDuration);
            const scale = b.size * t;
            b.sprite.scale.set(scale, scale, 1);
            b.sprite.material.opacity = (0.38 + (b.size - 0.65) * 0.18) * t;
            b.sprite.position.y = b.baseY;
            if (t >= 1) {
              b.state = 'normal';
            }
          } else if (b.state === 'normal') {
            // Move rightward only, keep y fixed in bottom band
            b.sprite.position.x += b.speedX;
            b.sprite.position.y = b.baseY;
            b.sprite.scale.set(b.size, b.size, 1);
            b.sprite.material.opacity = 0.38 + (b.size - 0.65) * 0.18; // restore opacity
            // If about to vanish, start pop
            if (b.sprite.position.x > 5.7) {
              b.state = 'popping';
              b.popStart = performance.now();
              spawnPopParticles(b.sprite.position.x, b.sprite.position.y, b.sprite.position.z);
            }
          } else if (b.state === 'popping') {
            // Pop animation: scale up and fade out
            const popDuration = 120; // ms, quicker
            const elapsed = performance.now() - b.popStart;
            const t = Math.min(1, elapsed / popDuration);
            const scale = b.size * (1 + 0.7 * t);
            b.sprite.scale.set(scale, scale, 1);
            b.sprite.material.opacity = (1 - t) * (0.38 + (b.size - 0.65) * 0.18) + t * 0.1;
            if (t >= 1) {
              // Reset bubble to left edge and grow-in
              b.sprite.position.x = -6;
              b.sprite.position.y = b.baseY;
              b.sprite.scale.set(0, 0, 1);
              b.sprite.material.opacity = 0.0;
              b.state = 'growing';
              b.growStart = performance.now();
            }
          }
        }
        // Animate pop splash particles
        for (let i = popParticles.length - 1; i >= 0; i--) {
          const p = popParticles[i];
          const t = (now - p.start) / p.duration;
          if (t >= 1) {
            if (bubblesGroup && p.sprite) bubblesGroup.remove(p.sprite);
            popParticles.splice(i, 1);
            continue;
          }
          p.sprite.position.x += p.vx;
          p.sprite.position.y += p.vy;
          p.sprite.material.opacity = 0.85 * (1 - t);
          const s = 0.11 * (1 - t) + 0.07 * t;
          p.sprite.scale.set(s, s, 1);
        }
      }
      // Animate interactive bubbles (day click)
      for (let i = interactiveBubbles.length - 1; i >= 0; i--) {
        const b = interactiveBubbles[i];
        if (b.state === 'growing') {
          // Match background bubble grow-in
          const growDuration = 1200;
          const elapsed = now - b.growStart;
          const t = Math.min(1, elapsed / growDuration);
          const scale = b.maxSize * t;
          b.sprite.scale.set(scale, scale, 1);
          b.sprite.material.opacity = 0.38 * t;
          b.sprite.position.copy(b.position);
          if (t >= 1) {
            b.state = 'normal';
            b.popStart = performance.now();
          }
        } else if (b.state === 'normal') {
          // Wait at max size, then pop
          const popDelay = 700 + Math.random() * 400;
          if (now - b.popStart > popDelay) {
            b.state = 'popping';
            b.popStart = performance.now();
          }
        } else if (b.state === 'popping') {
          // Match background bubble pop
          const popDuration = 220;
          const elapsed = now - b.popStart;
          const t = Math.min(1, elapsed / popDuration);
          const scale = b.maxSize * (1 + 0.7 * t);
          b.sprite.scale.set(scale, scale, 1);
          b.sprite.material.opacity = (1 - t) * 0.38 + t * 0.1;
          if (t >= 1) {
            spawnPopParticles(b.sprite.position.x, b.sprite.position.y, b.sprite.position.z);
            scene.remove(b.sprite);
            interactiveBubbles.splice(i, 1);
          }
        }
      }
      // Animate sun rays (day)
      if (sunRays && !isNight) {
        sunRays.material.opacity = 0.32 + 0.13 * Math.sin(now * 0.0007);
        // Animate rotation using the texture's center/rotation
        if (sunRays.material.map) {
          sunRays.material.map.center.set(0.5, 0.5);
          sunRays.material.map.rotation += 0.0007;
          sunRays.material.map.needsUpdate = true;
        }
      }
      // Animate shimmer (sun/moon)
      if (shimmerSprite && shimmerActive) {
        const shimmerDuration = 900;
        const t = Math.min(1, (now - shimmerStart) / shimmerDuration);
        shimmerSprite.material.opacity = 0.7 * (1 - t);
        shimmerSprite.scale.set(2.2 + 0.7 * t, 2.2 + 0.7 * t, 1);
        shimmerSprite.position.y = 3.2 + 0.2 * t;
        if (t >= 1) {
          scene.remove(shimmerSprite);
          shimmerActive = false;
        }
      } else if (!shimmerActive && Math.random() < 0.002) {
        // Occasionally trigger shimmer
        createShimmer(!isNight);
      }
      // Animate all shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        const elapsed = now - star.start;
        const lastElapsed = star.lastElapsed || 0;
        const delta = elapsed - lastElapsed;
        star.lastElapsed = elapsed;
        star.sprite.position.x += star.vx * delta;
        star.sprite.position.y += star.vy * delta;
        // Fade in at start, then normal, then flash+fade at end
        const t = elapsed / star.duration;
        // --- Glow effect ---
        // Calculate offset for glow at the tip of the star
        let glowOffsetX = 0, glowOffsetY = 0;
        if (star.sprite) {
          // The tip is at half the width in the direction of the star's rotation
          const length = star.sprite.scale.x * 0.5; // half the width
          const angle = star.sprite.material.rotation;
          glowOffsetX = Math.cos(angle) * length;
          glowOffsetY = Math.sin(angle) * length;
        }
        if (t > 0.85) {
          if (!star.glowSprite) {
            // Create and add glow sprite at star's position
            star.glowSprite = createStarGlowSprite();
            star.glowSprite.position.copy(star.sprite.position).add(new THREE.Vector3(glowOffsetX, glowOffsetY, 0));
            scene.add(star.glowSprite);
          } else {
            // Keep glow at star's position
            star.glowSprite.position.copy(star.sprite.position).add(new THREE.Vector3(glowOffsetX, glowOffsetY, 0));
          }
          // Fade in then out
          const flashT = (t - 0.85) / 0.15; // 0 to 1
          if (flashT < 0.5) {
            // Fade in
            star.glowSprite.material.opacity = flashT * 2 * 0.7; // up to 0.7
          } else {
            // Fade out
            star.glowSprite.material.opacity = (1 - (flashT - 0.5) * 2) * 0.7;
          }
        } else if (star.glowSprite) {
          // Remove glow if it exists but not in end phase
          scene.remove(star.glowSprite);
          star.glowSprite = undefined;
        }
        if (t < 0.15) {
          // Fade in
          star.sprite.material.opacity = t / 0.15;
          star.sprite.scale.set(2.2, 0.28, 1);
        } else if (t > 0.85) {
          // Dying star flash: scale up and brighten, then fade out
          const flashT = (t - 0.85) / 0.15; // 0 to 1
          // Flash: scale up, then fade out
          const scale = 2.2 + 1.2 * flashT;
          star.sprite.scale.set(scale, 0.28 + 0.18 * flashT, 1);
          star.sprite.material.opacity = 1 - flashT * 0.85;
        } else {
          // Normal
          star.sprite.material.opacity = 1;
          star.sprite.scale.set(2.2, 0.28, 1);
        }
        if (elapsed > star.duration || star.sprite.position.x > 8) {
          scene.remove(star.sprite);
          if (star.glowSprite) scene.remove(star.glowSprite);
          shootingStars.splice(i, 1);
        }
      }
      renderer.render(scene, cameraRef.current!);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const currentMount = mountRef.current;
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [loading, summary, urduSummary, isNight]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputMode === 'text' && text.trim()) {
      onSubmit({ mode: inputMode, value: text.trim() });
    } else if (inputMode === 'url' && url.trim()) {
      onSubmit({ mode: inputMode, value: url.trim() });
    }
  };

  // Glow state for Nexium badge
  const [nexiumGlow, setNexiumGlow] = useState(false);
  const handleNexiumGlow = () => {
    setNexiumGlow(true);
    setTimeout(() => setNexiumGlow(false), 2200);
  };

  // Ref for summary/translation panel
  const summaryRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full min-h-screen">
      <Navbar isNight={isNight} onToggleTheme={handleToggleTheme} />
      {/* Three.js Canvas */}
      <div ref={mountRef} className="absolute inset-0" />
      
      {/* Stylish Nexium Project Badge */}
      <div className="fixed bottom-4 right-4 z-50">
        <div
          className={`px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-xl border border-white/30 transition-all duration-700 ${nexiumGlow ? (isNight ? 'nexium-glow-night' : 'nexium-glow-day') : ''}`}
          style={{
            background: isNight
              ? 'linear-gradient(120deg, rgba(80,180,255,0.28) 0%, rgba(180,120,255,0.16) 100%)'
              : 'linear-gradient(120deg, rgba(255,255,255,0.54) 0%, rgba(200,230,255,0.18) 100%)',
            boxShadow: isNight
              ? '0 2px 12px 0 rgba(80,180,255,0.10), 0 1px 4px 0 rgba(120,80,255,0.07)'
              : '0 1px 6px 0 rgba(180,220,255,0.08)',
            border: isNight
              ? '1px solid rgba(255,255,255,0.13)'
              : '1px solid rgba(180,220,255,0.13)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            minWidth: '120px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4em',
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={handleNexiumGlow}
          tabIndex={0}
          aria-label="A project for NEXIUM"
        >
          {/* Glowing Accent Dot */}
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isNight
                ? 'radial-gradient(circle, #7cf6ff 0%, #4f8cff 60%, #fff0 100%)'
                : 'radial-gradient(circle, #b0eaff 0%, #a0cfff 60%, #fff0 100%)',
              boxShadow: isNight
                ? '0 0 8px 2px #7cf6ff99'
                : '0 0 4px 1px #b0eaff66',
              marginRight: '0.3em',
              flexShrink: 0,
            }}
          />
          <span
            className="font-extrabold tracking-widest text-xs md:text-sm"
            style={{
              color: isNight ? 'rgba(255,255,255,0.96)' : 'rgba(40,60,90,0.92)',
              letterSpacing: '0.11em',
              textShadow: isNight
                ? '0 1px 6px #4f8cff33, 0 1px 2px #fff6'
                : '0 1px 2px #b0eaff33, 0 1px 2px #fff6',
              fontFamily: 'Geist, Arial, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            A project for <span style={{color: isNight ? '#7cf6ff' : '#4f8cff', textShadow: isNight ? '0 0 4px #7cf6ffcc' : '0 0 2px #b0eaffcc'}}>NEXIUM</span>
          </span>
        </div>
      </div>
      
      {/* Floating Input Panel (now animates up and shrinks when summary is shown) */}
      <div
        id="input-panel"
        className={`absolute left-1/2 z-10 transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          inputMinimized
            ? 'top-1/5 -translate-x-1/2 -translate-y-0 scale-90'
            : 'top-1/2 -translate-x-1/2 -translate-y-1/2 scale-100'
        }`}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
        {/* Toggle for input mode */}
        <div className="flex justify-center mb-4 gap-2">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-l-xl font-bold text-base transition-all duration-200 focus:outline-none ${inputMode === 'text' ? 'bg-blue-500 text-white shadow' : 'bg-white/30 text-blue-700 hover:bg-blue-100'}`}
            onClick={() => setInputMode('text')}
            aria-pressed={inputMode === 'text'}
          >
            Text
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-r-xl font-bold text-base transition-all duration-200 focus:outline-none ${inputMode === 'url' ? 'bg-blue-500 text-white shadow' : 'bg-white/30 text-blue-700 hover:bg-blue-100'}`}
            onClick={() => setInputMode('url')}
            aria-pressed={inputMode === 'url'}
          >
            URL
          </button>
        </div>
        <div
          className="backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 transition-all duration-700"
          style={{
            background: 'linear-gradient(120deg, rgba(255,255,255,0.13) 0%, rgba(120,180,255,0.10) 100%)',
            boxShadow: '0 8px 40px 0 rgba(80,180,255,0.10), 0 2px 12px 0 rgba(120,80,255,0.07)',
            border: '1.5px solid rgba(255,255,255,0.13)',
            padding: inputMinimized ? '1.2rem 1rem' : '2.5rem 2rem',
            maxWidth: inputMinimized ? '520px' : '720px',
            minWidth: inputMinimized ? '320px' : '420px',
            transition: 'all 1s cubic-bezier(0.4,0,0.2,1)',
            margin: '0 auto',
            position: 'relative',
          }}
        >
          <h1
            className="text-4xl md:text-5xl font-extrabold text-center mb-6 select-none relative transition-all duration-1000"
            style={{
              background: 'linear-gradient(90deg, #60aaff 0%, #a084ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 4px 32px #a084ff44, 0 1.5px 8px #60aaff33',
              letterSpacing: '0.04em',
              fontFamily: 'Geist, Arial, sans-serif',
              lineHeight: 1.1,
              cursor: 'pointer',
              transition: 'text-shadow 0.3s',
              fontSize: inputMinimized ? '2.2rem' : '3rem',
              marginBottom: inputMinimized ? '1.2rem' : '2rem',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.textShadow = '0 0 24px #a084ffcc, 0 1.5px 8px #60aaff99';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.textShadow = '0 4px 32px #a084ff44, 0 1.5px 8px #60aaff33';
            }}
          >
            Blog Summariser <span style={{fontSize:'0.9em', filter:'drop-shadow(0 0 8px #fff8)'}}>✨</span>
            <span
              className="absolute left-1/2 -bottom-2.5 -translate-x-1/2 h-1 w-24 rounded-full bg-gradient-to-r from-blue-400/60 via-purple-400/40 to-blue-400/60 blur-sm opacity-80 animate-pulse"
              aria-hidden="true"
            />
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {inputMode === 'text' ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your blog or article text here..."
                  className="w-full px-5 py-4 bg-white/10 rounded-2xl border-2 border-transparent text-lg text-blue-900 placeholder-blue-400 font-semibold focus:outline-none shadow-xl transition-all duration-200 min-h-[120px] resize-y glass-textarea"
                  style={{
                    boxShadow: '0 2px 16px 0 rgba(80,180,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    fontFamily: 'Geist, Arial, sans-serif',
                    letterSpacing: '0.01em',
                    minHeight: inputMinimized ? '60px' : '120px',
                    maxHeight: inputMinimized ? '80px' : '240px',
                    fontSize: inputMinimized ? '1rem' : '1.15rem',
                    transition: 'all 1s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  required
                  disabled={inputMinimized}
                />
              ) : (
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="Paste a blog/article URL here..."
                  className="w-full px-5 py-4 bg-white/10 rounded-2xl border-2 border-transparent text-lg text-blue-900 placeholder-blue-400 font-semibold focus:outline-none shadow-xl transition-all duration-200 glass-textarea"
                  style={{
                    boxShadow: '0 2px 16px 0 rgba(80,180,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    fontFamily: 'Geist, Arial, sans-serif',
                    letterSpacing: '0.01em',
                    fontSize: inputMinimized ? '1rem' : '1.15rem',
                    transition: 'all 1s cubic-bezier(0.4,0,0.2,1)',
                  }}
                  required
                  disabled={inputMinimized}
                  pattern="https?://.+"
                />
              )}
            </div>
            <button
              type="submit"
              disabled={loading || inputMinimized}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 mt-2 rounded-2xl font-extrabold text-lg md:text-xl tracking-wide bg-gradient-to-r from-blue-400 via-purple-500 to-blue-500 text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed gradient-btn"
              style={{
                boxShadow: '0 2px 24px 0 #a084ff44, 0 1.5px 8px 0 #60aaff33',
                letterSpacing: '0.06em',
                fontFamily: 'Geist, Arial, sans-serif',
                position: 'relative',
              }}
            >
              {loading ? 'Processing...' : 'Summarize & Translate'}
              {!loading && (
                <span style={{display:'inline-block', marginLeft:'0.2em', filter:'drop-shadow(0 0 6px #fff8)'}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-arrow-right">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
              <span className="absolute inset-0 rounded-2xl pointer-events-none gradient-btn-glow" aria-hidden="true" />
            </button>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-200 text-center">{error}</p>
            </div>
          )}
        </div>
        {/* Summary/Translation Panel below input, centered, with typing effect */}
        {showSummary && (
          <div ref={summaryRef} className={`mt-10 flex justify-center w-full transition-all duration-500 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-2xl border border-white/20 max-w-4xl w-full flex flex-col items-center">
              {/* Close (cross) button */}
              <button
                type="button"
                aria-label="Close summary and translation"
                onClick={handleCloseSummary}
                className="absolute top-3 right-3 text-white/80 hover:text-red-400 bg-white/10 hover:bg-white/30 rounded-full p-2 shadow border border-white/20 transition-all duration-200 focus:outline-none z-10"
                style={{backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)'}}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="6" x2="16" y2="16" />
                  <line x1="16" y1="6" x2="6" y2="16" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                Summary Generated Successfully! 🎉
              </h2>
              <div className="grid md:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-blue-300">English Summary</h3>
                    <button
                      type="button"
                      aria-label="Copy English summary"
                      onClick={() => handleCopy(summary || '', 'en')}
                      className="bg-white/20 hover:bg-white/40 text-blue-400 hover:text-blue-600 rounded-full p-1.5 shadow transition-all duration-200 border border-white/30 focus:outline-none flex items-center"
                      style={{backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)'}}
                      disabled={!summary}
                    >
                      {copied === 'en' ? (
                        <span className="text-xs font-bold text-blue-500 px-2">Copied!</span>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="7" y="7" width="9" height="9" rx="2.5"/>
                          <path d="M4.5 13V4.5A2.5 2.5 0 0 1 7 2h6.5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="relative w-full flex flex-col items-center">
                    <p
                      className={`leading-relaxed text-center min-h-[60px] text-base md:text-lg ${isNight ? 'text-white/90' : 'text-gray-800'} transition-all duration-300`}
                      style={{wordBreak:'break-word', fontFamily:'Geist, Arial, sans-serif', maxHeight: expandBoth ? '1000px' : '3.8em', overflow: 'hidden'}}
                    >
                      {expandBoth ? typedSummary : getFirstLines(typedSummary, 2)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-purple-300">اردو خلاصہ</h3>
                    <button
                      type="button"
                      aria-label="Copy Urdu summary"
                      onClick={() => handleCopy(urduSummary || '', 'ur')}
                      className="bg-white/20 hover:bg-white/40 text-purple-400 hover:text-purple-600 rounded-full p-1.5 shadow transition-all duration-200 border border-white/30 focus:outline-none flex items-center"
                      style={{backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)'}}
                      disabled={!urduSummary}
                    >
                      {copied === 'ur' ? (
                        <span className="text-xs font-bold text-purple-500 px-2">Copied!</span>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="7" y="7" width="9" height="9" rx="2.5"/>
                          <path d="M4.5 13V4.5A2.5 2.5 0 0 1 7 2h6.5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="relative w-full flex flex-col items-center">
                    <p
                      className={`leading-relaxed text-center min-h-[60px] text-base md:text-lg ${isNight ? 'text-white/90' : 'text-gray-800'} transition-all duration-300`}
                      dir="rtl"
                      style={{wordBreak:'break-word', fontFamily:'Geist, Arial, sans-serif', maxHeight: expandBoth ? '1000px' : '3.8em', overflow: 'hidden'}}
                    >
                      {expandBoth ? typedUrdu : getFirstLines(typedUrdu, 2)}
                    </p>
                  </div>
                </div>
              </div>
              {/* Centered expand/collapse arrow for both paragraphs */}
              {(typedSummary && typedSummary.split(/(?<=[.!?])\s+/g).length > 2) || (typedUrdu && typedUrdu.split(/(?<=[.!?])\s+/g).length > 2) ? (
                <div className="flex justify-center w-full mt-2">
                  <button
                    type="button"
                    aria-label={expandBoth ? 'Collapse summary and translation' : 'Expand summary and translation'}
                    onClick={() => setExpandBoth(e => !e)}
                    className="text-blue-400 hover:text-blue-600 transition-colors duration-200 focus:outline-none"
                    style={{background:'none', border:'none', cursor:'pointer'}}
                  >
                    <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transform: expandBoth ? 'rotate(180deg)' : 'none', transition:'transform 0.2s'}}>
                      <polyline points="6 9 11 14 16 9" />
                    </svg>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Loading Text */}
      {loading && (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 z-10">
          <p className="text-white/80 text-center text-lg">
            Analyzing content and generating summary...
          </p>
        </div>
      )}

      <style>{`
        .glass-textarea:focus {
          border-color: #7cf6ff;
          box-shadow: 0 0 0 3px #7cf6ff55, 0 2px 16px 0 rgba(80,180,255,0.13);
          background: linear-gradient(120deg, rgba(255,255,255,0.18) 0%, rgba(120,180,255,0.13) 100%);
        }
        .nexium-glow-night {
          box-shadow: 0 0 32px 8px #7cf6ffcc, 0 0 16px 4px #a084ffcc, 0 2px 12px 0 #7cf6ff55 !important;
          background: linear-gradient(120deg, #b0eaff 0%, #a084ff 100%) !important;
          border-color: #7cf6ffcc !important;
          transition: box-shadow 0.7s, background 0.7s, border-color 0.7s;
        }
        .nexium-glow-day {
          box-shadow: 0 0 32px 10px #60eaffcc, 0 0 18px 6px #fff, 0 2px 12px 0 #b0eaff99 !important;
          background: linear-gradient(120deg, #e0f7ff 0%, #b0eaff 100%) !important;
          border-color: #60eaffcc !important;
          transition: box-shadow 0.7s, background 0.7s, border-color 0.7s;
        }
      `}</style>
    </div>
  );
} 