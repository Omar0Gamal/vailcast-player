# vailcast-player

A canvas-based HLS video player with moving watermark overlays, plus optional React and Angular adapters.

## Features

- Framework-agnostic core engine
- UI modes: headless or Cinema-style custom controls
- React adapter via `vailcast-player/react`
- Angular adapter via `vailcast-player/angular`
- Strict TypeScript declarations for all public APIs
- npm-friendly ESM + CJS bundles

## Installation

```bash
npm install vailcast-player hls.js
```

## Usage (Core)

```ts
import { VailcastPlayer } from 'vailcast-player';
import 'vailcast-player/styles.css';

const host = document.getElementById('player-root');

if (!host) {
  throw new Error('Missing player container');
}

const player = new VailcastPlayer(host, {
  manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  userID: 'viewer-123',
  ui: {
    mode: 'cinema',
    speedOptions: [0.5, 0.75, 1, 1.25, 1.5, 2],
    previewVttUrl: 'https://cdn.example.com/thumbs/preview.vtt',
  },
  watermark: {
    enabled: true,
    jumpIntervalMs: 3000,
  },
});

void player.play();
```

## Usage (React)

```tsx
import { VailcastReactPlayer } from 'vailcast-player/react';
import type { VailcastOptions } from 'vailcast-player';
import 'vailcast-player/styles.css';

const config: VailcastOptions = {
  manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  userID: 'react-user',
};

export function PlayerView() {
  return <VailcastReactPlayer config={config} />;
}
```

## UI Modes

`VailcastOptions.ui` accepts:

```ts
{
  mode?: 'headless' | 'cinema';
  controls?: boolean;
  speedOptions?: number[];
  previewVttUrl?: string;
  attemptPreviewVtt?: boolean;
  inputTheme?: {
    accentColor?: string;
    trackColor?: string;
    focusColor?: string;
    selectedColor?: string;
  };
}
```

- `headless` (default): hides the native `<video>` element and renders frames on canvas.
- `cinema`: enables a clean custom control bar with speed + resolution dials and timeline preview support.
- `controls`: optional override for Cinema controls behavior (defaults to `true` in `cinema` mode).
- `speedOptions`: playback rates shown in the speed dial (defaults to `[0.75, 1, 1.25, 1.5, 2]`).
- `previewVttUrl`: thumbnail VTT URL for timeline preview hover cards.
- `attemptPreviewVtt`: when `true`, tries to infer a VTT URL from the manifest (defaults to `true` in `cinema` mode).
- `inputTheme`: customize the Cinema control input colors (accent, focus, track, selected menu state).

## Security

`userID` is immutable by default after player initialization.

```ts
{
  security?: {
    lockUserID?: boolean; // default true
  };
}
```

When `lockUserID` is enabled, calling `updateOptions` with a different `userID` throws an error.

## Usage (Angular)

```ts
import { Component } from '@angular/core';
import type { VailcastOptions } from 'vailcast-player';
import { VailcastComponent } from 'vailcast-player/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VailcastComponent],
  template: `<vailcast-player [config]="config"></vailcast-player>`,
})
export class AppComponent {
  config: VailcastOptions = {
    manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    userID: 'angular-user',
  };
}
```

## Development

```bash
npm install
npm run validate
npm run build
```

## Local Examples

- Vanilla HTML: `examples/vanilla-html/index.html`
- Next.js integration app: `examples/nextjs-app`

## Scripts

- `npm run build`: Build TypeScript bundles and copy CSS
- `npm run typecheck`: Strict TS typecheck
- `npm run lint`: ESLint checks
- `npm run test`: Vitest test suite
- `npm run validate`: typecheck + lint + test + build

## Repository

- Source: https://github.com/Omar0Gamal/vailcast-player
- Issues: https://github.com/Omar0Gamal/vailcast-player/issues
- Discussions: https://github.com/Omar0Gamal/vailcast-player/discussions
- Security reports: https://github.com/Omar0Gamal/vailcast-player/security/advisories/new

## License

MIT
