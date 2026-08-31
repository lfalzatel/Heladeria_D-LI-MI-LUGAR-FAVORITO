import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playEventSound } from '../lib/soundEffects';

interface DualTrajectoryBurstProps {
  trigger: boolean;
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
}

interface Particle {
  id: number;
  icon: string;
  target: 'bell' | 'nav';
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  delay: number;
}

export default function DualTrajectoryBurst({ trigger, onComplete, startPosition }: DualTrajectoryBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Reproducir sonido de confirmación configurado
    playEventSound('burst');

    // Obtener elementos destino en el DOM
    const bellEl = document.getElementById('notification-bell-target');
    const navEl = document.getElementById('bottom-nav-orders-target');

    const bellRect = bellEl ? bellEl.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 };
    const navRect = navEl ? navEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 50, width: 40, height: 40 };

    const startX = startPosition?.x ?? window.innerWidth / 2;
    const startY = startPosition?.y ?? window.innerHeight / 2;

    const bellTargetX = bellRect.left + bellRect.width / 2;
    const bellTargetY = bellRect.top + bellRect.height / 2;

    const navTargetX = navRect.left + navRect.width / 2;
    const navTargetY = navRect.top + navRect.height / 2;

    const icons = ['🍦', '🍨', '🍧', '🪙', '✨', '⭐', '🍓'];
    const generated: Particle[] = [];

    // 6 partículas hacia la campana y 6 hacia el menú inferior
    for (let i = 0; i < 12; i++) {
      const isBell = i % 2 === 0;
      generated.push({
        id: Date.now() + i,
        icon: icons[i % icons.length],
        target: isBell ? 'bell' : 'nav',
        startX,
        startY,
        targetX: isBell ? bellTargetX : navTargetX,
        targetY: isBell ? bellTargetY : navTargetY,
        delay: (i * 0.06),
      });
    }

    setParticles(generated);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1800);

    return () => clearTimeout(timer);
  }, [trigger]);

  if (!trigger || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.startX,
              y: p.startY,
              scale: 0.2,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              x: [
                p.startX,
                p.startX + (p.target === 'bell' ? 40 : -40),
                p.targetX
              ],
              y: [
                p.startY,
                p.startY - (p.target === 'bell' ? 60 : 30),
                p.targetY
              ],
              scale: [0.4, 1.4, 0.5],
              opacity: [0, 1, 0.9, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.1,
              delay: p.delay,
              ease: [0.25, 0.8, 0.25, 1],
            }}
            className="absolute text-2xl select-none drop-shadow-lg"
          >
            {p.icon}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
