import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hyperspeed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070510, 0.025);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 1.5, -50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x070510, 1);
    container.appendChild(renderer.domElement);

    // Road surface
    const roadW = 10, roadL = 200;
    const roadGeo = new THREE.PlaneGeometry(roadW, roadL);
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x080510 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -roadL / 2 + 8);
    scene.add(road);

    // Lane dashes
    const dashGeo = new THREE.PlaneGeometry(0.12, 1.8);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x1a1525, transparent: true, opacity: 0.6 });
    for (let z = 0; z > -roadL; z -= 4) {
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.01, z);
      scene.add(d);
    }

    // Side lines (road edges)
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2a1530, transparent: true, opacity: 0.4 });
    for (const xOff of [-roadW / 2, roadW / 2]) {
      const edgeGeo = new THREE.PlaneGeometry(0.08, roadL);
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(xOff, 0.01, -roadL / 2 + 8);
      scene.add(edge);
    }

    // Car headlight colors
    const COLORS = [0xec4899, 0xf9a8d4, 0xbe185d, 0xfda4af, 0xf43f5e, 0xff6b9d, 0xc026d3, 0xe879f9];

    interface CarLight {
      group: THREE.Group;
      speed: number;
      lane: number;
      direction: number; // 1 = coming toward, -1 = going away
    }

    const cars: CarLight[] = [];
    const CAR_COUNT = 60;

    const createCar = (startZ?: number): CarLight => {
      const group = new THREE.Group();
      const direction = Math.random() > 0.4 ? -1 : 1; // More cars going away
      const laneOffset = direction === 1 ? -(1 + Math.random() * 3) : (1 + Math.random() * 3);
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      // Headlight glow (2 lights per car)
      const spacing = 0.3 + Math.random() * 0.2;
      for (let i = -1; i <= 1; i += 2) {
        // Core light
        const lightGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(i * spacing, 0.4, 0);
        group.add(light);

        // Glow sprite
        const spriteMat = new THREE.SpriteMaterial({
          color,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.3,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.2 + Math.random() * 0.8, 0.6 + Math.random() * 0.3, 1);
        sprite.position.set(i * spacing, 0.4, 0);
        group.add(sprite);
      }

      // Light trail (streak behind the car)
      const trailLen = 3 + Math.random() * 6;
      const trailGeo = new THREE.PlaneGeometry(0.04, trailLen);
      const trailMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.15,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.rotation.x = -Math.PI / 2;
      trail.position.set(0, 0.05, direction * trailLen / 2);
      group.add(trail);

      const z = startZ !== undefined ? startZ : -Math.random() * roadL;
      group.position.set(laneOffset, 0, z);
      scene.add(group);

      return {
        group,
        speed: (0.15 + Math.random() * 0.35) * (direction === 1 ? 1 : 0.7),
        lane: laneOffset,
        direction,
      };
    };

    for (let i = 0; i < CAR_COUNT; i++) {
      cars.push(createCar());
    }

    // Side lamp posts with pink glow
    for (let z = 0; z > -roadL; z -= 12) {
      for (const side of [-1, 1]) {
        const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 3, 6);
        const postMat = new THREE.MeshBasicMaterial({ color: 0x15101e });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(side * (roadW / 2 + 0.5), 1.5, z);
        scene.add(post);

        const bulbMat = new THREE.SpriteMaterial({
          color: 0xec4899,
          transparent: true,
          opacity: 0.3,
          blending: THREE.AdditiveBlending,
        });
        const bulb = new THREE.Sprite(bulbMat);
        bulb.scale.set(1.5, 1.5, 1);
        bulb.position.set(side * (roadW / 2 + 0.5), 3.2, z);
        scene.add(bulb);
      }
    }

    // Ground reflection glow
    const glowGeo = new THREE.PlaneGeometry(roadW + 4, roadL);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.02,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, 0.02, -roadL / 2 + 8);
    scene.add(glow);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      for (const car of cars) {
        car.group.position.z += car.speed * car.direction;

        if (car.direction === 1 && car.group.position.z > 12) {
          car.group.position.z = -roadL + Math.random() * 20;
        } else if (car.direction === -1 && car.group.position.z < -roadL) {
          car.group.position.z = 8 + Math.random() * 5;
        }
      }

      // Subtle camera sway
      const t = Date.now() * 0.00015;
      camera.position.x = Math.sin(t) * 0.3;
      camera.position.y = 4 + Math.sin(t * 1.3) * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-0" />;
}
