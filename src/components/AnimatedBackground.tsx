import { useEffect, useRef } from 'react';

interface Ribbon {
  y: number;
  speed: number;
  amplitude: number;
  frequency: number;
  phase: number;
  color: string;
  width: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Pink palette
    const pinks = [
      'hsla(340, 82%, 55%, ',
      'hsla(350, 80%, 60%, ',
      'hsla(330, 70%, 50%, ',
      'hsla(320, 75%, 58%, ',
      'hsla(345, 85%, 65%, ',
      'hsla(310, 60%, 45%, ',
    ];

    // Flowing ribbons
    const ribbons: Ribbon[] = [];
    for (let i = 0; i < 6; i++) {
      ribbons.push({
        y: h * (0.15 + Math.random() * 0.7),
        speed: 0.3 + Math.random() * 0.5,
        amplitude: 30 + Math.random() * 60,
        frequency: 0.002 + Math.random() * 0.003,
        phase: Math.random() * Math.PI * 2,
        color: pinks[i % pinks.length],
        width: 80 + Math.random() * 120,
        opacity: 0.04 + Math.random() * 0.06,
      });
    }

    // Floating particles
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 45;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 1 + Math.random() * 2.5,
        color: pinks[Math.floor(Math.random() * pinks.length)],
        opacity: 0.2 + Math.random() * 0.5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      });
    }

    let animId: number;
    let t = 0;

    const draw = () => {
      animId = requestAnimationFrame(draw);
      t += 1;

      // Clear with dark bg
      ctx.fillStyle = '#070510';
      ctx.fillRect(0, 0, w, h);

      // Draw ribbons
      for (const r of ribbons) {
        r.phase += r.speed * 0.008;
        ctx.beginPath();
        for (let x = -10; x <= w + 10; x += 4) {
          const wave = Math.sin(x * r.frequency + r.phase) * r.amplitude
            + Math.sin(x * r.frequency * 0.5 + r.phase * 1.3) * r.amplitude * 0.5;
          const y = r.y + wave;
          if (x === -10) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Close the ribbon shape
        for (let x = w + 10; x >= -10; x -= 4) {
          const wave = Math.sin(x * r.frequency + r.phase + 0.8) * r.amplitude
            + Math.sin(x * r.frequency * 0.5 + r.phase * 1.3 + 0.5) * r.amplitude * 0.5;
          const y = r.y + wave + r.width;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, r.y - r.amplitude, 0, r.y + r.width + r.amplitude);
        grad.addColorStop(0, r.color + '0)');
        grad.addColorStop(0.3, r.color + r.opacity + ')');
        grad.addColorStop(0.7, r.color + r.opacity * 0.8 + ')');
        grad.addColorStop(1, r.color + '0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;

        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
        const r = p.radius * (0.8 + 0.2 * Math.sin(p.pulse));

        // Glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
        glow.addColorStop(0, p.color + currentOpacity * 0.6 + ')');
        glow.addColorStop(0.5, p.color + currentOpacity * 0.15 + ')');
        glow.addColorStop(1, p.color + '0)');
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - r * 8, p.y - r * 8, r * 16, r * 16);

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + currentOpacity + ')';
        ctx.fill();
      }

      // Connect nearby particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(340, 82%, 55%, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // Subtle center glow
      const centerGlow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
      centerGlow.addColorStop(0, 'hsla(340, 82%, 55%, 0.03)');
      centerGlow.addColorStop(0.5, 'hsla(330, 70%, 50%, 0.015)');
      centerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, w, h);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
}
