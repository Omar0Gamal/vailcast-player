# vailcast-player

A canvas-based HLS video player with moving watermark overlays, plus optional React and Angular adapters.

## Features

- Framework-agnostic core engine
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

## First npm release

1. Ensure GitHub Actions secret NPM_TOKEN is set for the repository.
2. Run the release preflight locally:
   - npm run release:check
3. Create and push the first stable tag:
   - git tag -a v1.0.0 -m "release: v1.0.0"
   - git push origin v1.0.0

Pushing a v* tag triggers the publish workflow in GitHub Actions.

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
