import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { VailcastPlayer } from '../core/VailcastPlayer';
import type { VailcastOptions } from '../core/types';

export interface VailcastReactPlayerProps {
  config: VailcastOptions;
  className?: string;
  style?: CSSProperties;
}

export function VailcastReactPlayer({ config, className, style }: VailcastReactPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VailcastPlayer | null>(null);
  const initialConfigRef = useRef(config);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    playerRef.current = new VailcastPlayer(containerRef.current, initialConfigRef.current);

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    playerRef.current?.updateOptions(config);
  }, [config]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  );
}
