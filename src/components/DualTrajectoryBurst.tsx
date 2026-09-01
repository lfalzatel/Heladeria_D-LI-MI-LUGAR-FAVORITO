import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActionEventType, playEventSound } from '../lib/soundEffects';

interface DualTrajectoryBurstProps {
  trigger: boolean;
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
  targetAId?: string;
  targetBId?: string;
  eventType?: ActionEventType;
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

export default function DualTrajectoryBurst({ 
  trigger, 
  onComplete, 
  startPosition,
  targetAId = 'notification-bell-target',
  targetBId = 'bottom-nav-orders-target',
  eventType = 'burst_start'
}: DualTrajectoryBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Reproducir los 2 momentos de audio: Despegue (0ms) y Vuelo (300ms)
    playEventSound('burst_start');
    const flightAudioTimer = setTimeout(() => {
      playEventSound('burst_flight');
    }, 300);

    // Obtener elementos destino en el DOM
    const bellEl = document.getElementById(targetAId) || document.getElementById('user-profile-capsule-target') || document.getElementById('notification-bell-target');
    const navEl = document.getElementById(targetBId) || document.getElementById('bottom-nav-home-target') || document.getElementById('bottom-nav-orders-target');

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

    // 6 partículas hacia destino A y 6 hacia destino B
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
        delay: (i * 0.08),
      });
    }

    setParticles(generated);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 2400);

    return () => {
      clearTimeout(timer);
      clearTimeout(flightAudioTimer);
    };
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
              scale: 0.1,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              x: [
                p.startX,
                p.startX + (p.target === 'bell' ? 60 : -60),
                p.targetX
              ],
              y: [
                p.startY,
                p.startY - (p.target === 'bell' ? 90 : 40),
                p.targetY
              ],
              scale: [0.3, 1.5, 1.5, 1.2, 0.2],
              opacity: [0, 1, 1, 1, 0],
              rotate: [0, 180, 540],
            }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              times: [0, 0.1, 0.8, 0.95, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute text-3xl select-none drop-shadow-xl pointer-events-none"
          >
            {p.icon}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
