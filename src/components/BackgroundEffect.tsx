"use client";

import { useEffect, useRef } from "react";

interface Orb {
  x: number; y: number; r: number; vx: number; vy: number; color: string;
}

export default function BackgroundEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let cw: number, ch: number;
    const orbs: Orb[] = [];

    const init = () => {
      cw = canvas.width = window.innerWidth;
      ch = canvas.height = window.innerHeight;
      if (orbs.length === 0) {
        orbs.push(
          { x: cw * 0.3, y: ch * 0.2, r: Math.max(cw, ch) * 0.4, vx: 0.2, vy: 0.15, color: "#2a0835" },
          { x: cw * 0.7, y: ch * 0.8, r: Math.max(cw, ch) * 0.45, vx: -0.15, vy: -0.2, color: "#500000" },
          { x: cw * 0.5, y: ch * 0.5, r: Math.max(cw, ch) * 0.5, vx: 0.1, vy: -0.1, color: "#0a0a14" }
        );
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, cw, ch);
      for (const orb of orbs) {
        orb.x += orb.vx; orb.y += orb.vy;
        if (orb.x < -orb.r || orb.x > cw + orb.r) orb.vx *= -1;
        if (orb.y < -orb.r || orb.y > ch + orb.r) orb.vy *= -1;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color); grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2); ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    init();
    window.addEventListener("resize", init);
    draw();

    return () => { window.removeEventListener("resize", init); cancelAnimationFrame(animId); };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="abyss-canvas" />
      <div className="noise-layer" />
    </>
  );
}
