import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COLORS = [
  new THREE.Color('hsl(340, 82%, 55%)'),
  new THREE.Color('hsl(350, 80%, 60%)'),
  new THREE.Color('hsl(330, 70%, 50%)'),
  new THREE.Color('hsl(345, 90%, 65%)'),
  new THREE.Color('hsl(320, 60%, 45%)'),
];

const LINE_COUNT = 300;
const SPEED = 0.008;
const TRAIL_LENGTH = 1.8;
const SPREAD = 12;
const DEPTH = 40;

export default function Hyperspeed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.5, 0);
    camera.lookAt(0, 1.5, -DEPTH);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x070510, 1);
    container.appendChild(renderer.domElement);

    // Create light streaks as lines
    const lines: {
      mesh: THREE.Mesh;
      speed: number;
      baseY: number;
      baseX: number;
    }[] = [];

    const createLine = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const width = 0.01 + Math.random() * 0.025;
      const height = 0.005 + Math.random() * 0.01;
      const length = TRAIL_LENGTH + Math.random() * 2;

      const geometry = new THREE.BoxGeometry(width, height, length);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);

      const side = Math.random() > 0.5 ? 1 : -1;
      const x = (1 + Math.random() * SPREAD) * side;
      const y = Math.random() * 3;
      const z = -Math.random() * DEPTH;

      mesh.position.set(x, y, z);

      scene.add(mesh);

      return {
        mesh,
        speed: SPEED + Math.random() * SPEED * 2,
        baseY: y,
        baseX: x,
      };
    };

    for (let i = 0; i < LINE_COUNT; i++) {
      lines.push(createLine());
    }

    // Road surface — subtle grid
    const roadGeo = new THREE.PlaneGeometry(SPREAD * 3, DEPTH * 2, 30, 60);
    const roadMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('hsl(340, 30%, 8%)'),
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.1, -DEPTH / 2);
    scene.add(road);

    // Center dashed line
    for (let i = 0; i < 40; i++) {
      const dashGeo = new THREE.BoxGeometry(0.06, 0.005, 0.6);
      const dashMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('hsl(340, 82%, 55%)'),
        transparent: true,
        opacity: 0.15,
      });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(0, 0.01, -i * 1.2);
      scene.add(dash);
    }

    // Ambient glow particles
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = -Math.random() * DEPTH;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: new THREE.Color('hsl(340, 82%, 55%)'),
      size: 0.06,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      for (const line of lines) {
        line.mesh.position.z += line.speed * 60;
        if (line.mesh.position.z > 2) {
          line.mesh.position.z = -DEPTH - Math.random() * 10;
          const side = Math.random() > 0.5 ? 1 : -1;
          line.mesh.position.x = (1 + Math.random() * SPREAD) * side;
          line.mesh.position.y = Math.random() * 3;
        }
      }

      // Subtle camera sway
      const t = Date.now() * 0.0003;
      camera.position.x = Math.sin(t) * 0.15;
      camera.rotation.z = Math.sin(t * 0.7) * 0.003;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      scene.clear();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0" style={{ background: '#070510' }} />
  );
}
