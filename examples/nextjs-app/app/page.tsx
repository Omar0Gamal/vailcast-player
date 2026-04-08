'use client';

import { VailcastReactPlayer } from 'vailcast-player/react';
import type { VailcastOptions } from 'vailcast-player';

const config: VailcastOptions = {
  manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  userID: 'nextjs-dev',
  ui: {
    mode: 'cinema',
    speedOptions: [0.5, 0.75, 1, 1.25, 1.5, 2],
    previewVttUrl: '/previews/demo-thumbnails.vtt',
    inputTheme: {
      accentColor: 'oklch(0.68 0.22 28)',
      focusColor: 'oklch(0.84 0.14 74)',
      trackColor: 'oklch(0.75 0.03 270 / 0.45)',
      selectedColor: 'oklch(0.68 0.22 28 / 0.92)',
    },
  },
  security: {
    lockUserID: true,
  },
  hlsConfig: {
    xhrSetup(xhr) {
      xhr.withCredentials = false;
    },
  },
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
