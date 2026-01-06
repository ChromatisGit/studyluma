"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Connection, Vec2 } from '@features/homepage/sections/Background/nodeNetworkHelpers';
import {
  generateNodes,
  getNodeCount,
  generateConnections,
  calculateNodePosition,
  updateConnectionRandomness,
  isConnectionActive,
} from '@features/homepage/sections/Background/nodeNetworkHelpers';
import styles from '@features/homepage/sections/Background/NodeNetwork.module.css';

const INITIAL_DELAY_MAX = 1000; // ms
const OPACITY_TRANSITION_DURATION = 500; // ms
const INITIALIZATION_DELAY = 1000; // ms

export function NodeNetwork() {
  const nodes = useMemo(() => generateNodes(getNodeCount()), []);
  const connections = useMemo<Connection[]>(() => generateConnections(nodes), [nodes]);
  const [initialDelays, setInitialDelays] = useState<number[]>([]);
  const [nodePositions, setNodePositions] = useState<Vec2[]>(() =>
    nodes.map((node) => ({ x: node.baseX, y: node.baseY }))
  );
  const [activeConnections, setActiveConnections] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInitialDelays(connections.map(() => Math.random() * (INITIAL_DELAY_MAX / 1000)));
  }, [connections]);

  useEffect(() => {
    startTimeRef.current = Date.now();

    let isVisible = true;

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;

      if (isVisible && !animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const animate = () => {
      if (!isVisible) {
        animationRef.current = undefined;
        return;
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      const newPositions = nodes.map((node, idx) =>
        calculateNodePosition(node, idx, elapsed)
      );
      setNodePositions(newPositions);

      const active = new Set<string>();
      connections.forEach((conn) => {
        updateConnectionRandomness(conn, elapsed);

        if (isConnectionActive(conn, newPositions[conn.start], newPositions[conn.end])) {
          active.add(`${conn.start}-${conn.end}`);
        }
      });
      setActiveConnections(active);

      if (!hasInitializedRef.current && elapsed > INITIALIZATION_DELAY / 1000) {
        hasInitializedRef.current = true;
        setHasInitialized(true);
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
  }, [connections, nodes]);

  if (!mounted) {
    return <div className={styles.nodeNetwork} />;
  }

  return (
    <div className={styles.nodeNetwork}>
      <svg
        viewBox="-10 0 120 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <g>
          {connections.map((conn, idx) => {
            const start = nodePositions[conn.start];
            const end = nodePositions[conn.end];
            const isActive = activeConnections.has(`${conn.start}-${conn.end}`);
            const initialDelay = initialDelays[idx] ?? 0;

            return (
              <line
                key={`connection-${conn.start}-${conn.end}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className={styles.connection}
                style={{
                  opacity: isActive ? 0.3 : 0,
                  transitionDuration: `${OPACITY_TRANSITION_DURATION}ms`,
                  transitionDelay: hasInitialized ? '0ms' : `${initialDelay * 1000}ms`,
                }}
              />
            );
          })}
        </g>

        <g>
          {nodes.map((node, idx) => {
            const pos = nodePositions[idx];
            return (
              <circle
                key={`node-${node.id}`}
                cx={pos.x}
                cy={pos.y}
                r={node.size * 0.25}
                className={styles.node}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
