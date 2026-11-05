'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  angle: number;
  radius: number;
  y: number;
  speedAngle: number;
  speedY: number;
  size: number;
  color: string;
  alpha: number;
  branchOffset: number;
}

export const ParticleVortexCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Interactive Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - width / 2) * 0.0006;
      mouseY = (e.clientY - height / 2) * 0.0006;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Palette matching Prompt Blue + AI Green + Cyber Blue + Violet
    const palette = ['#39FF88', '#38BDF8', '#6BFFAA', '#3B82F6', '#818CF8'];

    // =========================================================================
    // 1. CREATE 1,600 NEURAL TREE PARTICLES (Funnel / Canopy Geometry)
    // =========================================================================
    const PARTICLE_COUNT = 1600;
    const particles: Particle[] = [];

    const createParticle = (randomY = true): Particle => {
      // y goes from 0 (bottom base) to 1 (top canopy)
      const yProgress = randomY ? Math.random() : 0;
      return {
        angle: Math.random() * Math.PI * 2,
        radius: Math.random(),
        y: yProgress,
        speedAngle: 0.003 + Math.random() * 0.006,
        speedY: 0.0012 + Math.random() * 0.002,
        size: 1 + Math.random() * 2.2,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 0.25 + Math.random() * 0.75,
        branchOffset: (Math.random() - 0.5) * 35,
      };
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }

    // =========================================================================
    // 2. 3D WIREFRAME / PARTICLE CUBE VERTICES (Anchor AI Style Cube)
    // =========================================================================
    const cubeSize = 65;
    const cubeVertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1],
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    let globalTime = 0;

    // 3D to 2D Perspective Projection Helper
    const project3D = (x: number, y: number, z: number, cx: number, cy: number, fov = 550) => {
      const scale = fov / (fov + z + 400);
      return {
        px: cx + x * scale,
        py: cy + y * scale,
        scale,
      };
    };

    const render = () => {
      globalTime += 0.015;
      targetX += (mouseX - targetX) * 0.06;
      targetY += (mouseY - targetY) * 0.06;

      // Deep Space Prompt Blue Background with smooth trail fade
      ctx.fillStyle = '#070D1F';
      ctx.fillRect(0, 0, width, height);

      // Center Radial Core Glow
      const centerGlow = ctx.createRadialGradient(
        width / 2,
        height * 0.48,
        10,
        width / 2,
        height * 0.48,
        Math.max(width, height) * 0.55
      );
      centerGlow.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
      centerGlow.addColorStop(0.35, 'rgba(57, 255, 136, 0.06)');
      centerGlow.addColorStop(1, 'rgba(7, 13, 31, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const baseY = height * 0.78;
      const treeHeight = Math.min(height * 0.62, 520);

      // =======================================================================
      // A. DRAW CONCENTRIC GROUND RIPPLE RINGS (Like the video floor)
      // =======================================================================
      const ringCount = 7;
      for (let r = 0; r < ringCount; r++) {
        const rippleProgress = ((globalTime * 0.35 + r / ringCount) % 1);
        const rx = rippleProgress * Math.min(width * 0.46, 540);
        const ry = rx * 0.22; // Elliptical 3D perspective
        const ringAlpha = (1 - rippleProgress) * 0.35;

        ctx.beginPath();
        ctx.ellipse(
          centerX,
          baseY + 15,
          rx,
          ry,
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = r % 2 === 0 
          ? `rgba(57, 255, 136, ${ringAlpha})` 
          : `rgba(56, 189, 248, ${ringAlpha})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // =======================================================================
      // B. DRAW 3D NEURAL PARTICLE TREE (Trunk -> Expanding Canopy)
      // =======================================================================
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.angle += p.speedAngle;

        if (p.y > 1) {
          p.y = 0;
          p.angle = Math.random() * Math.PI * 2;
        }

        // Mathematical Tree Shape:
        // Narrow trunk in the middle (y: 0.15 to 0.45), wide roots at 0, wide canopy at y > 0.5
        let spreadRadius = 0;
        if (p.y < 0.2) {
          // Root flare at the bottom
          spreadRadius = (1 - p.y / 0.2) * 140 + 18;
        } else if (p.y < 0.48) {
          // Tight swirling trunk
          spreadRadius = 18 + (p.y - 0.2) * 55;
        } else {
          // Massive blooming canopy at the top
          const canopyProgress = (p.y - 0.48) / 0.52;
          spreadRadius = 34 + Math.pow(canopyProgress, 1.65) * Math.min(width * 0.36, 420);
        }

        const currentRadius = spreadRadius * (0.25 + 0.75 * p.radius) + p.branchOffset * p.y;

        // 3D Coordinates
        const rawX = Math.cos(p.angle + globalTime * 0.2) * currentRadius;
        const rawZ = Math.sin(p.angle + globalTime * 0.2) * currentRadius;
        // Arch canopy slightly downward at the outer edges like a real willow/neural tree
        const canopyArch = p.y > 0.65 ? Math.pow(currentRadius / 360, 2) * 55 : 0;
        const rawY = -p.y * treeHeight + canopyArch;

        // Apply Mouse Tilt Rotation
        const cosX = Math.cos(targetY);
        const sinX = Math.sin(targetY);
        const cosY = Math.cos(targetX);
        const sinY = Math.sin(targetX);

        const rotX = rawX * cosY - rawZ * sinY;
        const rotZ = rawZ * cosY + rawX * sinY;
        const rotY = rawY * cosX - rotZ * sinX;

        const { px, py, scale } = project3D(rotX, rotY, rotZ, centerX, baseY);

        // Fade in at bottom, fade out at very top
        const edgeFade = p.y < 0.1 ? p.y * 10 : p.y > 0.88 ? (1 - p.y) * 8.3 : 1;
        const finalAlpha = Math.max(0, Math.min(1, p.alpha * edgeFade * scale));

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.6, p.size * scale), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = finalAlpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // =======================================================================
      // C. DRAW ROTATING 3D HOLOGRAPHIC CUBE (On Right/Left Flank for Desktop)
      // =======================================================================
      if (width > 1024) {
        const cubeCenterX = width * 0.82;
        const cubeCenterY = height * 0.72;
        const rotA = globalTime * 0.6;
        const rotB = globalTime * 0.4;

        const projectedVerts = cubeVertices.map(([vx, vy, vz]) => {
          // Rotate Y
          let x1 = vx * Math.cos(rotA) - vz * Math.sin(rotA);
          let z1 = vz * Math.cos(rotA) + vx * Math.sin(rotA);
          // Rotate X
          let y1 = vy * Math.cos(rotB) - z1 * Math.sin(rotB);
          let z2 = z1 * Math.cos(rotB) + vy * Math.sin(rotB);

          return project3D(
            x1 * cubeSize,
            y1 * cubeSize,
            z2 * cubeSize,
            cubeCenterX,
            cubeCenterY,
            400
          );
        });

        // Draw glowing wireframe edges
        ctx.strokeStyle = 'rgba(57, 255, 136, 0.35)';
        ctx.lineWidth = 1.2;
        cubeEdges.forEach(([i1, i2]) => {
          const v1 = projectedVerts[i1];
          const v2 = projectedVerts[i2];
          ctx.beginPath();
          ctx.moveTo(v1.px, v1.py);
          ctx.lineTo(v2.px, v2.py);
          ctx.stroke();
        });

        // Draw glowing corner nodes
        projectedVerts.forEach((v) => {
          ctx.beginPath();
          ctx.arc(v.px, v.py, 3 * v.scale, 0, Math.PI * 2);
          ctx.fillStyle = '#39FF88';
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
};
