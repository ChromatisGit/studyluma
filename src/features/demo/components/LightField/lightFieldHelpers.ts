export const PARTICLE_CONFIG = {
  VIEWBOX_CENTER_X: 50,
  VIEWBOX_CENTER_Y: 50,
  GEN_WIDTH: 140,
  GEN_HEIGHT: 120,
  MIN_CORE_R: 0.16,
  MAX_CORE_R: 0.42,
  MIN_HALO_R: 1.0,
  MAX_HALO_R: 3.0,
  MIN_DRIFT_SPEED: 0.35,
  MAX_DRIFT_SPEED: 0.9,
  MIN_PULSE_SPEED: 0.2,
  MAX_PULSE_SPEED: 0.65,
  JITTER_FACTOR: 0.45,
} as const;

export const PARTICLE_COUNTS = {
  MOBILE: 16,
  TABLET: 22,
  DESKTOP: 28,
} as const;

export const ANIMATION_CONFIG = {
  DRIFT_ANGLE_MULT: 0.09,
  MIN_DRIFT_RADIUS: 2,
  DRIFT_RADIUS_VARIATION: 3,
  Y_ANGLE_MULT: 0.72,
  CORE_MIN_OPACITY: 0.35,
  CORE_MAX_OPACITY: 1.0,
  HALO_MIN_OPACITY: 0.08,
  HALO_MAX_OPACITY: 0.3,
} as const;

export const ASPECT_RATIO_THRESHOLDS = {
  MOBILE_PORTRAIT: 0.75,
  TABLET: 1.2,
} as const;

export interface LightParticle {
  id: number;
  baseX: number;
  baseY: number;
  coreR: number;
  haloR: number;
  driftSpeed: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

function jitteredGrid(width: number, height: number, nx: number, ny: number): Vec2[] {
  const points: Vec2[] = [];
  const cellW = width / nx;
  const cellH = height / ny;
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const jx = (Math.random() - 0.5) * cellW * PARTICLE_CONFIG.JITTER_FACTOR;
      const jy = (Math.random() - 0.5) * cellH * PARTICLE_CONFIG.JITTER_FACTOR;
      points.push({ x: (ix + 0.5) * cellW + jx, y: (iy + 0.5) * cellH + jy });
    }
  }
  return points;
}

export function getParticleCount(): number {
  if (typeof window === 'undefined') return PARTICLE_COUNTS.DESKTOP;
  const ar = window.innerWidth / window.innerHeight;
  if (ar < ASPECT_RATIO_THRESHOLDS.MOBILE_PORTRAIT) return PARTICLE_COUNTS.MOBILE;
  if (ar < ASPECT_RATIO_THRESHOLDS.TABLET) return PARTICLE_COUNTS.TABLET;
  return PARTICLE_COUNTS.DESKTOP;
}

export function generateParticles(count: number): LightParticle[] {
  const {
    VIEWBOX_CENTER_X, VIEWBOX_CENTER_Y, GEN_WIDTH, GEN_HEIGHT,
    MIN_CORE_R, MAX_CORE_R, MIN_HALO_R, MAX_HALO_R,
    MIN_DRIFT_SPEED, MAX_DRIFT_SPEED, MIN_PULSE_SPEED, MAX_PULSE_SPEED,
  } = PARTICLE_CONFIG;

  const nx = Math.ceil(Math.sqrt(count * (GEN_WIDTH / GEN_HEIGHT)));
  const ny = Math.ceil(count / nx);
  const points = jitteredGrid(GEN_WIDTH, GEN_HEIGHT, nx, ny).slice(0, count);

  return points.map((pt, i) => ({
    id: i + 1,
    baseX: VIEWBOX_CENTER_X + (pt.x - GEN_WIDTH / 2),
    baseY: VIEWBOX_CENTER_Y + (pt.y - GEN_HEIGHT / 2),
    coreR: MIN_CORE_R + Math.random() * (MAX_CORE_R - MIN_CORE_R),
    haloR: MIN_HALO_R + Math.random() * (MAX_HALO_R - MIN_HALO_R),
    driftSpeed: MIN_DRIFT_SPEED + Math.random() * (MAX_DRIFT_SPEED - MIN_DRIFT_SPEED),
    pulseSpeed: MIN_PULSE_SPEED + Math.random() * (MAX_PULSE_SPEED - MIN_PULSE_SPEED),
    pulsePhase: Math.random() * Math.PI * 2,
  }));
}

export function calculateParticlePosition(particle: LightParticle, index: number, elapsed: number): Vec2 {
  const { DRIFT_ANGLE_MULT, MIN_DRIFT_RADIUS, DRIFT_RADIUS_VARIATION, Y_ANGLE_MULT } = ANIMATION_CONFIG;
  const angle = elapsed * particle.driftSpeed * DRIFT_ANGLE_MULT;
  const radius = MIN_DRIFT_RADIUS + (index % DRIFT_RADIUS_VARIATION);
  return {
    x: particle.baseX + Math.sin(angle + index) * radius,
    y: particle.baseY + Math.cos(angle * Y_ANGLE_MULT + index) * radius,
  };
}

export function calculateParticleOpacity(particle: LightParticle, elapsed: number): number {
  const t = 0.5 + 0.5 * Math.sin(elapsed * particle.pulseSpeed + particle.pulsePhase);
  return t;
}
