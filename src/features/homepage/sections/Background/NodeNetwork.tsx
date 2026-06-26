import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Connection, RandomnessState } from '@features/homepage/sections/Background/nodeNetworkHelpers';
import {
  generateNodes,
  getNodeCount,
  generateConnections,
  calculateNodePosition,
  getConnectionRandomness,
  isConnectionActiveWithRandomness,
} from '@features/homepage/sections/Background/nodeNetworkHelpers';
import styles from '@features/homepage/sections/Background/NodeNetwork.module.css';

const INITIALIZATION_DELAY_S = 1; // seconds
const OPACITY_TRANSITION_DURATION = 500; // ms

interface ConnectionWithMeta extends Connection {
  key: string;
  initialDelay: number;
}

export function NodeNetwork() {
  const [mounted, setMounted] = useState(false);

  // Generate nodes and connections once on mount
  const nodes = useMemo(() => generateNodes(getNodeCount()), []);
  const connections = useMemo<ConnectionWithMeta[]>(() => {
    const conns = generateConnections(nodes);
    return conns.map((conn, idx) => ({
      ...conn,
      key: `${conn.start}-${conn.end}`,
      // Use deterministic initial delay based on index to avoid impure render
      initialDelay: ((idx * 7919) % 1000) / 1000,
    }));
  }, [nodes]);

  // Refs for direct DOM manipulation - avoids React re-renders during animation
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([]);
  const connectionRefs = useRef<(SVGLineElement | null)[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);

  // Pre-allocated arrays to avoid GC during animation
  const positionsRef = useRef<{ x: number; y: number }[]>([]);
  const randomnessRef = useRef<RandomnessState[]>([]);

  // Ref setters using useCallback to avoid creating new functions on each render
  const setNodeRef = useCallback((index: number) => (el: SVGCircleElement | null) => {
    nodeRefs.current[index] = el;
  }, []);

  const setConnectionRef = useCallback((index: number) => (el: SVGLineElement | null) => {
    connectionRefs.current[index] = el;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize pre-allocated arrays
  useEffect(() => {
    positionsRef.current = nodes.map((node) => ({ x: node.baseX, y: node.baseY }));
    randomnessRef.current = connections.map(() => ({ offset: 0, nextChange: 0 }));
  }, [nodes, connections]);

  // Animation loop - runs entirely outside React's render cycle
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
        // Adjust start time to account for time spent hidden
        startTimeRef.current += performance.now() - pausedAt;
        if (!animationRef.current) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }
    };

    const animate = () => {
      if (!isVisible) {
        animationRef.current = undefined;
        return;
      }

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const positions = positionsRef.current;
      const randomness = randomnessRef.current;

      // Update node positions directly in DOM
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const position = positions[i];
        if (!node || !position) continue;

        const pos = calculateNodePosition(node, i, elapsed);
        position.x = pos.x;
        position.y = pos.y;

        const el = nodeRefs.current[i];
        if (el) {
          el.setAttribute('cx', String(pos.x));
          el.setAttribute('cy', String(pos.y));
        }
      }

      // Update connections directly in DOM
      for (let i = 0; i < connections.length; i++) {
        const conn = connections[i];
        if (!conn) continue;

        const startPos = positions[conn.start];
        const endPos = positions[conn.end];
        const randomnessState = randomness[i];
        if (!startPos || !endPos || !randomnessState) continue;

        const el = connectionRefs.current[i];
        if (el) {
          el.setAttribute('x1', String(startPos.x));
          el.setAttribute('y1', String(startPos.y));
          el.setAttribute('x2', String(endPos.x));
          el.setAttribute('y2', String(endPos.y));

          // Update randomness state
          const newRandomness = getConnectionRandomness(randomnessState, elapsed);
          if (newRandomness !== randomnessState) {
            randomness[i] = newRandomness;
          }

          const currentRandomness = randomness[i] ?? newRandomness;
          const isActive = isConnectionActiveWithRandomness(
            conn.threshold,
            currentRandomness.offset,
            startPos,
            endPos
          );

          el.style.opacity = isActive ? '0.3' : '0';

          // Remove transition delay after initialization period
          if (!hasInitializedRef.current && elapsed > INITIALIZATION_DELAY_S) {
            el.style.transitionDelay = '0ms';
          }
        }
      }

      if (!hasInitializedRef.current && elapsed > INITIALIZATION_DELAY_S) {
        hasInitializedRef.current = true;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mounted, connections, nodes]);

  if (!mounted) {
    return <div className={styles.nodeNetwork} />;
  }

  // Initial render only - positions are updated via refs, not re-renders
  return (
    <div className={styles.nodeNetwork}>
      <svg viewBox="-10 0 120 100" preserveAspectRatio="xMidYMid slice">
        <g>
          {connections.map((conn, idx) => {
            const startNode = nodes[conn.start];
            const endNode = nodes[conn.end];
            if (!startNode || !endNode) return null;

            return (
              <line
                key={conn.key}
                ref={setConnectionRef(idx)}
                x1={startNode.baseX}
                y1={startNode.baseY}
                x2={endNode.baseX}
                y2={endNode.baseY}
                className={styles.connection}
                style={{
                  opacity: 0,
                  transitionDuration: `${OPACITY_TRANSITION_DURATION}ms`,
                  transitionDelay: `${conn.initialDelay * 1000}ms`,
                }}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((node, idx) => (
            <circle
              key={node.id}
              ref={setNodeRef(idx)}
              cx={node.baseX}
              cy={node.baseY}
              r={node.size * 0.25}
              className={styles.node}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
