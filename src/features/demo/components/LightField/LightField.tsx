"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  generateParticles,
  getParticleCount,
  calculateParticlePosition,
  calculateParticleOpacity,
  ANIMATION_CONFIG,
} from './lightFieldHelpers';
import styles from './LightField.module.css';

export function LightField() {
  const [mounted, setMounted] = useState(false);
  const particles = useMemo(() => generateParticles(getParticleCount()), []);

  const coreRefs = useRef<(SVGCircleElement | null)[]>([]);
  const haloRefs = useRef<(SVGCircleElement | null)[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const setCoreRef = useCallback((i: number) => (el: SVGCircleElement | null) => {
    coreRefs.current[i] = el;
  }, []);

  const setHaloRef = useCallback((i: number) => (el: SVGCircleElement | null) => {
    haloRefs.current[i] = el;
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    startTimeRef.current = performance.now();
    let isVisible = true;
    let pausedAt = 0;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        pausedAt = performance.now();
      } else {
        isVisible = true;
        startTimeRef.current += performance.now() - pausedAt;
        if (!animationRef.current) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
    };

    const {
      CORE_MIN_OPACITY, CORE_MAX_OPACITY,
      HALO_MIN_OPACITY, HALO_MAX_OPACITY,
    } = ANIMATION_CONFIG;

    const animate = () => {
      if (!isVisible) {
        animationRef.current = undefined;
        return;
      }

      const elapsed = (performance.now() - startTimeRef.current) / 1000;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p) continue;

        const pos = calculateParticlePosition(p, i, elapsed);
        const t = calculateParticleOpacity(p, elapsed);
        const coreOpacity = CORE_MIN_OPACITY + (CORE_MAX_OPACITY - CORE_MIN_OPACITY) * t;
        const haloOpacity = HALO_MIN_OPACITY + (HALO_MAX_OPACITY - HALO_MIN_OPACITY) * t;

        const core = coreRefs.current[i];
        const halo = haloRefs.current[i];

        if (core) {
          core.setAttribute('cx', String(pos.x));
          core.setAttribute('cy', String(pos.y));
          core.style.opacity = String(coreOpacity);
        }
        if (halo) {
          halo.setAttribute('cx', String(pos.x));
          halo.setAttribute('cy', String(pos.y));
          halo.style.opacity = String(haloOpacity);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, particles]);

  if (!mounted) return <div className={styles.lightField} />;

  return (
    <div className={styles.lightField}>
      <svg viewBox="-10 0 120 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="lf-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <g>
          {particles.map((p, i) => (
            <circle
              key={`h-${p.id}`}
              ref={setHaloRef(i)}
              cx={p.baseX}
              cy={p.baseY}
              r={p.haloR}
              className={styles.halo}
              style={{ opacity: 0 }}
            />
          ))}
        </g>
        <g>
          {particles.map((p, i) => (
            <circle
              key={`c-${p.id}`}
              ref={setCoreRef(i)}
              cx={p.baseX}
              cy={p.baseY}
              r={p.coreR}
              className={styles.core}
              style={{ opacity: 0 }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
