import Hls, { type HlsConfig } from 'hls.js';

const DEFAULT_HLS_CONFIG: Partial<HlsConfig> = {
  xhrSetup(xhr) {
    xhr.withCredentials = true;
  },
};

export class HlsManager {
  private hls: Hls | null = null;
  private manifestUrl: string | null = null;

  constructor(private readonly hlsConfig: Partial<HlsConfig> = {}) {}

  public attachMedia(video: HTMLVideoElement, manifestUrl: string): void {
    this.destroy();
    this.manifestUrl = manifestUrl;

    if (Hls.isSupported()) {
      this.hls = new Hls({
        ...DEFAULT_HLS_CONFIG,
        ...this.hlsConfig,
      });
      this.hls.loadSource(manifestUrl);
      this.hls.attachMedia(video);
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifestUrl;
    }
  }

  public updateSource(video: HTMLVideoElement, manifestUrl: string): void {
    if (manifestUrl === this.manifestUrl) {
      return;
    }

    this.manifestUrl = manifestUrl;

    if (this.hls) {
      this.hls.loadSource(manifestUrl);
      return;
    }

    video.src = manifestUrl;
  }

  public destroy(): void {
    if (!this.hls) {
      return;
    }

    this.hls.destroy();
    this.hls = null;
  }
}
