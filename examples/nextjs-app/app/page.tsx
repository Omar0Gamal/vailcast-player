'use client';

import { VailcastReactPlayer } from 'vailcast-player/react';
import type { VailcastOptions } from 'vailcast-player';

const config: VailcastOptions = {
  manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  userID: 'nextjs-dev',
  watermark: {
    enabled: true,
    jumpIntervalMs: 2500,
  },
};

export default function HomePage() {
  return (
    <main className="page-shell">
      <h1>Vailcast React Adapter</h1>
      <div className="player-frame">
        <VailcastReactPlayer config={config} />
      </div>
    </main>
  );
}
