"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useId } from 'react';
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
  const [isDark, setIsDark] = useState(false);
  const particles = useMemo(() => generateParticles(getParticleCount()), []);
  const filterIdBase = useId().replace(/:/g, "");
  const lightGlowFilterId = `${filterIdBase}-light`;
  const darkGlowFilterId = `${filterIdBase}-dark`;

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

  useEffect(() => {
    setMounted(true);

    const root = document.documentElement;
    const syncTheme = () => setIsDark(root.classList.contains("dark"));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

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
    const haloMinOpacity = isDark ? HALO_MIN_OPACITY : 0.2;
    const haloMaxOpacity = isDark ? HALO_MAX_OPACITY : 0.62;

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
        const haloOpacity = haloMinOpacity + (haloMaxOpacity - haloMinOpacity) * t;

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
  }, [isDark, mounted, particles]);

  if (!mounted) {
    return (
      <div className={styles.lightField} aria-hidden>
        <div className={styles.ambient} />
      </div>
    );
  }

  return (
    <div className={styles.lightField} aria-hidden>
      <div className={styles.ambient} />
      <svg
        className={styles.fieldSvg}
        viewBox="-10 0 120 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id={lightGlowFilterId} x="-220%" y="-220%" width="540%" height="540%">
            <feGaussianBlur stdDeviation="3.8" />
          </filter>
          <filter id={darkGlowFilterId} x="-180%" y="-180%" width="460%" height="460%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        <g className={styles.haloLayer}>
          {particles.map((p, i) => (
            <circle
              key={`h-${p.id}`}
              ref={setHaloRef(i)}
              cx={p.baseX}
              cy={p.baseY}
              r={isDark ? p.haloR : p.haloR * 1.9}
              className={styles.halo}
              style={{ opacity: 0, filter: `url(#${isDark ? darkGlowFilterId : lightGlowFilterId})` }}
            />
          ))}
        </g>
        <g className={styles.coreLayer}>
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
