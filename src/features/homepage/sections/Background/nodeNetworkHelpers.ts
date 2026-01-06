export const NODE_CONFIG = {
  VIEWBOX_CENTER_X: 50,
  VIEWBOX_CENTER_Y: 50,
  GEN_WIDTH: 200,
  GEN_HEIGHT: 160,
  MIN_SIZE: 5,
  MAX_SIZE: 10,
  MIN_SPEED: 0.6,
  MAX_SPEED: 1.4,
  JITTER_FACTOR: 0.4,
} as const;

export const CONNECTION_CONFIG = {
  MAX_DISTANCE: 50,
  MIN_CONNECTIONS: 2,
  MAX_CONNECTIONS: 4,
  MIN_THRESHOLD: 35,
  MAX_THRESHOLD: 55,
  RANDOM_OFFSET_RANGE: 25,
  RECONNECTION_INTERVAL_MIN: 1,
  RECONNECTION_INTERVAL_MAX: 2,
} as const;

export const ANIMATION_CONFIG = {
  ANGLE_MULTIPLIER: 0.15,
  MIN_RADIUS: 3,
  RADIUS_VARIATION: 3,
  Y_ANGLE_MULTIPLIER: 0.8,
} as const;

export const ASPECT_RATIO_THRESHOLDS = {
  MOBILE_PORTRAIT: 0.75,
  TABLET: 1.2,
} as const;

export const NODE_COUNTS = {
  MOBILE: 20,
  TABLET: 30,
  DESKTOP: 35,
} as const;

export interface Vec2 {
  x: number;
  y: number;
}

export interface NetworkNode {
  id: number;
  baseX: number;
  baseY: number;
  size: number;
  speed: number;
  offsetX: number;
  offsetY: number;
}

export interface Connection {
  start: number;
  end: number;
  threshold: number;
  randomOffset: number;
  nextRandomChange: number;
}

export function jitteredGrid(
  width: number,
  height: number,
  nx: number,
  ny: number
): Vec2[] {
  const points: Vec2[] = [];
  const cellW = width / nx;
  const cellH = height / ny;

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const baseX = (ix + 0.5) * cellW;
      const baseY = (iy + 0.5) * cellH;
      const jitterX = (Math.random() - 0.5) * cellW * NODE_CONFIG.JITTER_FACTOR;
      const jitterY = (Math.random() - 0.5) * cellH * NODE_CONFIG.JITTER_FACTOR;

      points.push({ x: baseX + jitterX, y: baseY + jitterY });
    }
  }

  return points;
}

export function getNodeCount(): number {
  if (typeof window === 'undefined') {
    return NODE_COUNTS.DESKTOP;
  }

  const aspectRatio = window.innerWidth / window.innerHeight;

  if (aspectRatio < ASPECT_RATIO_THRESHOLDS.MOBILE_PORTRAIT) {
    return NODE_COUNTS.MOBILE;
  }

  if (aspectRatio < ASPECT_RATIO_THRESHOLDS.TABLET) {
    return NODE_COUNTS.TABLET;
  }

  return NODE_COUNTS.DESKTOP;
}

export function generateNodes(count: number): NetworkNode[] {
  const { VIEWBOX_CENTER_X, VIEWBOX_CENTER_Y, GEN_WIDTH, GEN_HEIGHT, MIN_SIZE, MAX_SIZE, MIN_SPEED, MAX_SPEED } = NODE_CONFIG;

  const nx = Math.ceil(Math.sqrt(count * (GEN_WIDTH / GEN_HEIGHT)));
  const ny = Math.ceil(count / nx);

  const points = jitteredGrid(GEN_WIDTH, GEN_HEIGHT, nx, ny).slice(0, count);

  const nodes: NetworkNode[] = points.map((point, i) => ({
    id: i + 1,
    baseX: VIEWBOX_CENTER_X + (point.x - GEN_WIDTH / 2),
    baseY: VIEWBOX_CENTER_Y + (point.y - GEN_HEIGHT / 2),
    size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
    speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
    offsetX: 0,
    offsetY: 0,
  }));

  return nodes;
}

export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Generate connections only between nearby nodes
export function generateConnections(nodeList: NetworkNode[]): Connection[] {
  const connections: Connection[] = [];
  const {
    MAX_DISTANCE,
    MIN_CONNECTIONS,
    MAX_CONNECTIONS,
    MIN_THRESHOLD,
    MAX_THRESHOLD,
  } = CONNECTION_CONFIG;

  for (let i = 0; i < nodeList.length; i++) {
    const nearby = findNearbyNodes(nodeList, i, MAX_DISTANCE);
    if (!nearby.length) continue;

    const numConnections = Math.min(
      randInt(MIN_CONNECTIONS, MAX_CONNECTIONS),
      nearby.length
    );

    shuffleInPlace(nearby);

    for (let j = 0; j < numConnections; j++) {
      connections.push({
        start: i,
        end: nearby[j],
        threshold: randFloat(MIN_THRESHOLD, MAX_THRESHOLD),
        randomOffset: 0,
        nextRandomChange: 0,
      });
    }
  }

  return connections;
}

function findNearbyNodes(
  nodeList: NetworkNode[],
  currentIndex: number,
  maxDistance: number
): number[] {
  const nearby: number[] = [];
  const currentNode = nodeList[currentIndex];

  for (let j = 0; j < nodeList.length; j++) {
    if (j === currentIndex) continue;

    const distance = calculateDistance(
      currentNode.baseX,
      currentNode.baseY,
      nodeList[j].baseX,
      nodeList[j].baseY
    );

    if (distance < maxDistance) {
      nearby.push(j);
    }
  }

  return nearby;
}

export function calculateNodePosition(
  node: NetworkNode,
  nodeIndex: number,
  elapsedTime: number
): Vec2 {
  const {
    ANGLE_MULTIPLIER,
    MIN_RADIUS,
    RADIUS_VARIATION,
    Y_ANGLE_MULTIPLIER,
  } = ANIMATION_CONFIG;

  const angle = elapsedTime * node.speed * ANGLE_MULTIPLIER;
  const radius = MIN_RADIUS + (nodeIndex % RADIUS_VARIATION);

  return {
    x: node.baseX + Math.sin(angle + nodeIndex) * radius,
    y: node.baseY + Math.cos(angle * Y_ANGLE_MULTIPLIER + nodeIndex) * radius,
  };
}

export function updateConnectionRandomness(
  connection: Connection,
  elapsedTime: number
): void {
  if (elapsedTime <= connection.nextRandomChange) return;

  const {
    RANDOM_OFFSET_RANGE,
    RECONNECTION_INTERVAL_MIN,
    RECONNECTION_INTERVAL_MAX,
  } = CONNECTION_CONFIG;

  connection.randomOffset = (Math.random() - 0.5) * RANDOM_OFFSET_RANGE;

  connection.nextRandomChange =
    elapsedTime +
    randFloat(RECONNECTION_INTERVAL_MIN, RECONNECTION_INTERVAL_MAX);
}

export function isConnectionActive(
  connection: Connection,
  startPos: Vec2,
  endPos: Vec2
): boolean {
  const distance = calculateDistance(
    startPos.x,
    startPos.y,
    endPos.x,
    endPos.y
  );

  const effectiveThreshold = connection.threshold + connection.randomOffset;
  return distance < effectiveThreshold;
}

const randFloat = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const randInt = (min: number, max: number): number =>
  Math.floor(randFloat(min, max));

const shuffleInPlace = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};
