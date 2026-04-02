import { CanvasRenderer } from './renderer/canvas';
import { WatermarkRenderer } from './renderer/watermark';
import { HlsManager } from './hls-manager';
import type { ResolvedVailcastOptions, VailcastOptions } from './types';

const DEFAULT_WATERMARK = {
  enabled: true,
  jumpIntervalMs: 5000,
  font: '700 24px Arial, sans-serif',
  color: 'rgba(255, 255, 255, 0.4)',
};

export class VailcastPlayer {
  private readonly video: HTMLVideoElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hlsManager: HlsManager;
  private readonly canvasRenderer: CanvasRenderer;
  private readonly watermarkRenderer: WatermarkRenderer;

  private destroyed = false;
  private inputOptions: VailcastOptions;
  private options: ResolvedVailcastOptions;

  constructor(private readonly container: HTMLElement, userOptions: VailcastOptions) {
    if (!container) {
      throw new Error('A container element is required.');
    }

    this.inputOptions = { ...userOptions };
    this.options = resolveOptions(this.inputOptions);

    this.video = this.createVideoElement();
    this.canvas = this.createCanvasElement();

    this.container.classList.add('vailcast-player');
    this.container.append(this.video, this.canvas);

    this.hlsManager = new HlsManager(this.options.hlsConfig);
    this.watermarkRenderer = new WatermarkRenderer(this.options.watermark);
    this.canvasRenderer = new CanvasRenderer(this.video, this.canvas, (ctx, canvas, timestamp) => {
      this.watermarkRenderer.draw(ctx, canvas, timestamp);
    });

    this.video.addEventListener('play', this.onVideoPlay);
    this.video.addEventListener('pause', this.onVideoPause);
    this.video.addEventListener('ended', this.onVideoPause);

    this.video.autoplay = this.options.autoplay;
    this.video.muted = this.options.muted;
    this.hlsManager.attachMedia(this.video, this.options.manifestUrl);

    if (this.options.autoplay) {
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
    this.inputOptions = mergeOptions(this.inputOptions, nextOptions);

    const previousManifestUrl = this.options.manifestUrl;
    this.options = resolveOptions(this.inputOptions);

    this.video.autoplay = this.options.autoplay;
    this.video.muted = this.options.muted;

    if (this.options.manifestUrl !== previousManifestUrl) {
      this.hlsManager.updateSource(this.video, this.options.manifestUrl);
    }

    this.watermarkRenderer.updateConfig(this.options.watermark);
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.canvasRenderer.destroy();
    this.hlsManager.destroy();

    this.video.removeEventListener('play', this.onVideoPlay);
    this.video.removeEventListener('pause', this.onVideoPause);
    this.video.removeEventListener('ended', this.onVideoPause);

    this.video.remove();
    this.canvas.remove();
  }

  private readonly onVideoPlay = (): void => {
    this.canvasRenderer.start();
  };

  private readonly onVideoPause = (): void => {
    this.canvasRenderer.stop();
  };

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
    if (this.destroyed) {
      throw new Error('This VailcastPlayer instance has already been destroyed.');
    }
  }
}

function resolveOptions(options: VailcastOptions): ResolvedVailcastOptions {
  if (!options.manifestUrl) {
    throw new Error('manifestUrl is required.');
  }

  if (!options.userID) {
    throw new Error('userID is required.');
  }

  const watermark = options.watermark ?? {};

  return {
    manifestUrl: options.manifestUrl,
    userID: options.userID,
    autoplay: options.autoplay ?? false,
    muted: options.muted ?? false,
    hlsConfig: options.hlsConfig ?? {},
    watermark: {
      enabled: watermark.enabled ?? DEFAULT_WATERMARK.enabled,
      text: watermark.text ?? `ID: ${options.userID}`,
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

  return {
    ...current,
    ...patch,
    watermark,
    hlsConfig,
  };
}
