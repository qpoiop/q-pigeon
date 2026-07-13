import { useEffect, useRef } from 'react';
import { PigeonGame as Engine } from '../game/engine';
import type { GameOptions } from '../game/types';

/**
 * React host for the vanilla Three.js engine. The engine owns all DOM inside
 * the mount div; React only creates/destroys it and hands over initial options.
 * `options` are the starting defaults — players adjust cones/camera live from
 * the title screen, so we intentionally don't re-mount when they change.
 */
export function PigeonGame({ options }: { options: GameOptions }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;
    const engine = new Engine(host, options);
    engine.init();
    return () => {
      engine.dispose();
      host.replaceChildren();
    };
    // Mount once; the engine reads options at construction only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />;
}
