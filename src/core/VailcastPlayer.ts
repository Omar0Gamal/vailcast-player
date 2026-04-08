import { CanvasRenderer } from './renderer/canvas';
import { WatermarkRenderer } from './renderer/watermark';
import { HlsManager } from './hls-manager';
import { CinemaControls } from './ui/cinema-controls';
import type {
  PlayerUiMode,
  ResolvedPlayerUiConfig,
  ResolvedPlayerUiInputThemeConfig,
  ResolvedVailcastOptions,
  VailcastOptions,
} from './types';

const DEFAULT_WATERMARK = {
  enabled: true,
  jumpIntervalMs: 5000,
  font: '700 24px Arial, sans-serif',
  color: 'rgba(255, 255, 255, 0.4)',
};

const DEFAULT_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const DEFAULT_LOCK_USER_ID = true;
const IMMUTABLE_USER_ID_ERROR =
  'userID is locked for this player instance and cannot be changed after initialization.';

const DEFAULT_INPUT_THEME: ResolvedPlayerUiInputThemeConfig = {
  accentColor: 'oklch(0.64 0.26 27)',
  trackColor: 'oklch(0.68 0.01 260 / 0.5)',
  focusColor: 'oklch(0.72 0.2 35 / 0.85)',
  selectedColor: 'oklch(0.64 0.26 27 / 0.92)',
};

const HEADLESS_UI_CLASS = 'vailcast-player--ui-headless';
const CINEMA_UI_CLASS = 'vailcast-player--ui-cinema';

interface ResolveContext {
  lockUserID: boolean;
  lockedUserID?: string;
}

export class VailcastPlayer {
  private readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hlsManager: HlsManager;
  private readonly canvasRenderer: CanvasRenderer;
  private readonly watermarkRenderer: WatermarkRenderer;
  #cinemaControls: CinemaControls | null = null;

  #destroyed = false;
  #inputOptions: VailcastOptions;
  #options: ResolvedVailcastOptions;
  readonly #lockedUserID: string;
  readonly #userIDLocked: boolean;

  constructor(private readonly container: HTMLElement, userOptions: VailcastOptions) {
    if (!container) {
      throw new Error('A container element is required.');
    }

    this.#inputOptions = { ...userOptions };
    this.#options = resolveOptions(this.#inputOptions, {
      lockUserID: userOptions.security?.lockUserID ?? DEFAULT_LOCK_USER_ID,
    });
    this.#lockedUserID = this.#options.userID;
    this.#userIDLocked = this.#options.security.lockUserID;

    this.video = this.createVideoElement();
    this.canvas = this.createCanvasElement();

    this.container.classList.add('vailcast-player');
    this.container.append(this.video, this.canvas);

    this.hlsManager = new HlsManager(this.#options.hlsConfig);
    this.watermarkRenderer = new WatermarkRenderer(this.#options.watermark);
    this.canvasRenderer = new CanvasRenderer(this.video, this.canvas, (ctx, canvas, timestamp) => {
      this.watermarkRenderer.draw(ctx, canvas, timestamp);
    });
    this.applyUiConfig(this.#options.ui);

    this.video.addEventListener('play', this.onVideoPlay);
    this.video.addEventListener('pause', this.onVideoPause);
    this.video.addEventListener('ended', this.onVideoPause);

    this.video.autoplay = this.#options.autoplay;
    this.video.muted = this.#options.muted;
    this.hlsManager.attachMedia(this.video, this.#options.manifestUrl);

    if (this.#options.autoplay) {
      void this.play().catch(() => {
        // Autoplay can fail in browsers with strict media policies.
      });
    }
  }

  public async play(): Promise<void> {
    this.assertActive();
    await this.video.play();
    this.canvasRenderer.start();
  }

  public pause(): void {
    this.assertActive();
    this.video.pause();
    this.canvasRenderer.stop();
  }

  public updateOptions(nextOptions: Partial<VailcastOptions>): void {
    this.assertActive();

    if (
      this.#userIDLocked &&
      typeof nextOptions.userID === 'string' &&
      nextOptions.userID.trim() !== this.#lockedUserID
    ) {
      throw new Error(IMMUTABLE_USER_ID_ERROR);
    }

    const sanitizedPatch =
      this.#userIDLocked && typeof nextOptions.userID === 'string'
        ? {
            ...nextOptions,
            userID: this.#lockedUserID,
          }
        : nextOptions;

    this.#inputOptions = mergeOptions(this.#inputOptions, sanitizedPatch);

    const previousManifestUrl = this.#options.manifestUrl;
    this.#options = resolveOptions(this.#inputOptions, {
      lockUserID: this.#userIDLocked,
      lockedUserID: this.#userIDLocked ? this.#lockedUserID : undefined,
    });

    this.video.autoplay = this.#options.autoplay;
    this.video.muted = this.#options.muted;

    if (this.#options.manifestUrl !== previousManifestUrl) {
      this.hlsManager.updateSource(this.video, this.#options.manifestUrl);
    }

    this.applyUiConfig(this.#options.ui);
    this.watermarkRenderer.updateConfig(this.#options.watermark);
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.canvasRenderer.destroy();
    this.hlsManager.destroy();

    this.video.removeEventListener('play', this.onVideoPlay);
    this.video.removeEventListener('pause', this.onVideoPause);
    this.video.removeEventListener('ended', this.onVideoPause);

    this.#cinemaControls?.destroy();
    this.#cinemaControls = null;

    this.container.classList.remove(HEADLESS_UI_CLASS, CINEMA_UI_CLASS);
    this.video.remove();
    this.canvas.remove();
  }

  private readonly onVideoPlay = (): void => {
    this.canvasRenderer.start();
  };

  private readonly onVideoPause = (): void => {
    this.canvasRenderer.stop();
  };

  private applyUiConfig(ui: ResolvedPlayerUiConfig): void {
    const isHeadlessMode = ui.mode === 'headless';
    const isCinemaMode = ui.mode === 'cinema';

    this.video.controls = false;
    this.canvasRenderer.setDrawVideoFrame(isHeadlessMode);
    this.container.classList.toggle(HEADLESS_UI_CLASS, isHeadlessMode);
    this.container.classList.toggle(CINEMA_UI_CLASS, isCinemaMode);

    if (isCinemaMode && ui.controls) {
      if (!this.#cinemaControls) {
        this.#cinemaControls = new CinemaControls(this.container, this.video, this.hlsManager, ui);
      } else {
        this.#cinemaControls.updateConfig(ui);
      }
      return;
    }

    this.#cinemaControls?.destroy();
    this.#cinemaControls = null;
  }

  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.className = 'vailcast-player-video';
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'auto';
    return video;
  }

  private createCanvasElement(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = 'vailcast-player-canvas';
    return canvas;
  }

  private assertActive(): void {
    if (this.#destroyed) {
      throw new Error('This VailcastPlayer instance has already been destroyed.');
    }
  }
}

function resolveOptions(options: VailcastOptions, context: ResolveContext): ResolvedVailcastOptions {
  if (!options.manifestUrl) {
    throw new Error('manifestUrl is required.');
  }

  const lockUserID = context.lockUserID;
  const userID = (lockUserID && context.lockedUserID ? context.lockedUserID : options.userID)?.trim();

  if (!userID) {
    throw new Error('userID is required.');
  }

  const watermark = options.watermark ?? {};
  const ui = options.ui ?? {};
  const uiMode = normalizeUiMode(ui.mode);
  const controls = ui.controls ?? uiMode === 'cinema';
  const speedOptions = normalizeSpeedOptions(ui.speedOptions);
  const attemptPreviewVtt = ui.attemptPreviewVtt ?? uiMode === 'cinema';
  const previewVttUrl =
    normalizePreviewVttUrl(ui.previewVttUrl) ??
    (attemptPreviewVtt ? inferPreviewVttUrl(options.manifestUrl) : null);
  const inputTheme = resolveInputTheme(ui.inputTheme);

  return {
    manifestUrl: options.manifestUrl,
    userID,
    autoplay: options.autoplay ?? false,
    muted: options.muted ?? false,
    ui: {
      mode: uiMode,
      controls,
      speedOptions,
      previewVttUrl,
      attemptPreviewVtt,
      inputTheme,
    },
    security: {
      lockUserID,
    },
    hlsConfig: options.hlsConfig ?? {},
    watermark: {
      enabled: watermark.enabled ?? DEFAULT_WATERMARK.enabled,
      text: watermark.text ?? userID,
      jumpIntervalMs: watermark.jumpIntervalMs ?? DEFAULT_WATERMARK.jumpIntervalMs,
      font: watermark.font ?? DEFAULT_WATERMARK.font,
      color: watermark.color ?? DEFAULT_WATERMARK.color,
    },
  };
}

function mergeOptions(current: VailcastOptions, patch: Partial<VailcastOptions>): VailcastOptions {
  const watermark = patch.watermark
    ? {
        ...(current.watermark ?? {}),
        ...patch.watermark,
      }
    : current.watermark;

  const hlsConfig = patch.hlsConfig
    ? {
        ...(current.hlsConfig ?? {}),
        ...patch.hlsConfig,
      }
    : current.hlsConfig;

  const ui = patch.ui
    ? {
        ...(current.ui ?? {}),
        ...patch.ui,
      }
    : current.ui;

  const security = patch.security
    ? {
        ...(current.security ?? {}),
        ...patch.security,
      }
    : current.security;

  return {
    ...current,
    ...patch,
    ui,
    security,
    watermark,
    hlsConfig,
  };
}

function normalizeUiMode(mode?: PlayerUiMode): PlayerUiMode {
  return mode === 'cinema' ? 'cinema' : 'headless';
}

function normalizeSpeedOptions(input?: number[]): number[] {
  if (!input || input.length === 0) {
    return DEFAULT_SPEED_OPTIONS;
  }

  const validSpeeds = input
    .map((speed) => Number(speed))
    .filter((speed) => Number.isFinite(speed) && speed > 0)
    .map((speed) => Number(speed.toFixed(2)));

  if (!validSpeeds.includes(1)) {
    validSpeeds.push(1);
  }

  const uniqueSpeeds = Array.from(new Set(validSpeeds));
  uniqueSpeeds.sort((a, b) => a - b);
  return uniqueSpeeds.length > 0 ? uniqueSpeeds : DEFAULT_SPEED_OPTIONS;
}

function normalizePreviewVttUrl(url?: string): string | null {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveInputTheme(inputTheme?: {
  accentColor?: string;
  trackColor?: string;
  focusColor?: string;
  selectedColor?: string;
}): ResolvedPlayerUiInputThemeConfig {
  return {
    accentColor: normalizeThemeColor(inputTheme?.accentColor, DEFAULT_INPUT_THEME.accentColor),
    trackColor: normalizeThemeColor(inputTheme?.trackColor, DEFAULT_INPUT_THEME.trackColor),
    focusColor: normalizeThemeColor(inputTheme?.focusColor, DEFAULT_INPUT_THEME.focusColor),
    selectedColor: normalizeThemeColor(inputTheme?.selectedColor, DEFAULT_INPUT_THEME.selectedColor),
  };
}

function normalizeThemeColor(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function inferPreviewVttUrl(manifestUrl: string): string | null {
  try {
    const parsed = new URL(manifestUrl);
    if (!parsed.pathname.toLowerCase().endsWith('.m3u8')) {
      return null;
    }

    parsed.pathname = parsed.pathname.replace(/\.m3u8$/i, '.vtt');
    return parsed.toString();
  } catch {
    return null;
  }
}
