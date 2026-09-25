import { useEffect, useRef } from 'react';

export function LeafCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    function resize() {
      if (!canvas) return;
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);

    const COLORS = ['#6fa350', '#4f7a38', '#8fc46a', '#a4d482', '#5c8d3e', '#7eb559'];
    const COUNT = window.innerWidth < 700 ? 12 : 20;
    const mouse = { x: -9999, y: -9999 };

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    interface Leaf {
      x: number;
      y: number;
      size: number;
      color: string;
      alpha: number;
      vy: number;
      vx: number;
      baseSway: number;
      phase: number;
      rot: number;
      rotSpeed: number;
    }

    function makeLeaf(initial: boolean, spawnX?: number, spawnY?: number, burst = false): Leaf {
      const isBurst = burst && spawnX !== undefined && spawnY !== undefined;
      return {
        x: spawnX !== undefined ? spawnX : Math.random() * W,
        y: spawnY !== undefined ? spawnY : initial ? Math.random() * H : -30,
        size: isBurst ? 10 + Math.random() * 12 : 8 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: isBurst ? 0.75 + Math.random() * 0.25 : 0.25 + Math.random() * 0.28,
        vy: isBurst ? -(Math.random() * 2.5 + 1.2) : 0.35 + Math.random() * 0.45,
        vx: isBurst ? (Math.random() - 0.5) * 3.5 : 0,
        baseSway: 0.35 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * (isBurst ? 0.06 : 0.018),
      };
    }

    const leaves: Leaf[] = [];
    for (let i = 0; i < COUNT; i++) leaves.push(makeLeaf(true));

    // Spawn leaves at cursor on click / mousedown
    function onSpawnClick(e: MouseEvent | TouchEvent) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Spawn 4-6 bursting leaves from the click point
      const spawnCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < spawnCount; i++) {
        leaves.push(makeLeaf(false, clientX + (Math.random() - 0.5) * 10, clientY + (Math.random() - 0.5) * 10, true));
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mousedown', onSpawnClick);
    window.addEventListener('touchstart', onSpawnClick, { passive: true });

    function drawLeaf(l: Leaf) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, l.alpha));
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.moveTo(0, -l.size);
      ctx.quadraticCurveTo(l.size * 0.8, -l.size * 0.2, 0, l.size);
      ctx.quadraticCurveTo(-l.size * 0.8, -l.size * 0.2, 0, -l.size);
      ctx.closePath();
      ctx.fill();

      // Leaf central vein line
      ctx.globalAlpha = Math.max(0, Math.min(1, l.alpha * 0.75));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -l.size * 0.85);
      ctx.lineTo(0, l.size * 0.85);
      ctx.stroke();
      ctx.restore();
    }

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      for (let i = leaves.length - 1; i >= 0; i--) {
        const l = leaves[i];
        l.phase += 0.015;
        const sway = Math.sin(l.phase) * l.baseSway;

        // Gentle cursor push/repulsion for ambient leaves
        const dx = l.x - mouse.x;
        const dy = l.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = 130;
        if (dist < radius) {
          const force = (1 - dist / radius) * 2.0;
          l.vx += (dx / (dist || 1)) * force;
          l.vy += (dy / (dist || 1)) * force * 0.5;
        }

        // Apply gravity if bursting upwards
        if (l.vy < 0.4) {
          l.vy += 0.08;
        }

        l.vx *= 0.95;
        l.x += sway * 0.5 + l.vx;
        l.y += l.vy;
        l.rot += l.rotSpeed + l.vx * 0.01;

        if (l.y > H + 40 || l.x < -60 || l.x > W + 60) {
          if (leaves.length > COUNT) {
            // Remove click-spawned extra leaves once offscreen
            leaves.splice(i, 1);
            continue;
          } else {
            leaves[i] = makeLeaf(false);
          }
        }

        drawLeaf(l);
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mousedown', onSpawnClick);
      window.removeEventListener('touchstart', onSpawnClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] opacity-90"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
