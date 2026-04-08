import Hls, { type HlsConfig, type HlsListeners } from 'hls.js';

export interface HlsQualityLevel {
  id: number;
  width: number;
  height: number;
  bitrate: number;
  label: string;
}

type QualityStateListener = () => void;

interface HlsImmediateSwitchController {
  immediateLevelSwitch?: () => void;
}

interface HlsWithImmediateSwitch {
  nextLoadLevel?: number;
  streamController?: HlsImmediateSwitchController;
}

const DEFAULT_HLS_CONFIG: Partial<HlsConfig> = {
  xhrSetup(xhr) {
    xhr.withCredentials = true;
  },
};

export class HlsManager {
  private hls: Hls | null = null;
  private manifestUrl: string | null = null;
  private selectedQualityLevel: number | 'auto' = 'auto';
  private readonly qualityStateListeners = new Set<QualityStateListener>();
  private readonly hlsEventBindings: Array<{
    eventName: keyof HlsListeners;
    handler: () => void;
  }> = [];

  constructor(private readonly hlsConfig: Partial<HlsConfig> = {}) {}

  public attachMedia(video: HTMLVideoElement, manifestUrl: string): void {
    this.destroy();
    this.manifestUrl = manifestUrl;
    this.selectedQualityLevel = 'auto';

    if (Hls.isSupported()) {
      this.hls = new Hls({
        ...DEFAULT_HLS_CONFIG,
        ...this.hlsConfig,
      });
      this.bindHlsEvents();
      this.hls.loadSource(manifestUrl);
      this.hls.attachMedia(video);
      this.notifyQualityStateChange();
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifestUrl;
    }

    this.notifyQualityStateChange();
  }

  public updateSource(video: HTMLVideoElement, manifestUrl: string): void {
    if (manifestUrl === this.manifestUrl) {
      return;
    }

    this.manifestUrl = manifestUrl;
    this.selectedQualityLevel = 'auto';

    if (this.hls) {
      this.hls.loadSource(manifestUrl);
      this.notifyQualityStateChange();
      return;
    }

    video.src = manifestUrl;
    this.notifyQualityStateChange();
  }

  public destroy(): void {
    if (this.hls) {
      this.removeHlsEventBindings();
      this.hls.destroy();
      this.hls = null;
    }

    this.manifestUrl = null;
    this.selectedQualityLevel = 'auto';
    this.notifyQualityStateChange();
  }

  public usesHls(): boolean {
    return this.hls !== null;
  }

  public getQualityLevels(): HlsQualityLevel[] {
    if (!this.hls) {
      return [];
    }

    const levels = Array.isArray(this.hls.levels) ? this.hls.levels : [];

    return levels
      .map((level, id) => ({
        id,
        width: level.width ?? 0,
        height: level.height ?? 0,
        bitrate: level.bitrate ?? 0,
        label: formatQualityLabel(level.height ?? 0, level.bitrate ?? 0),
      }))
      .sort((a, b) => {
        if (a.height !== b.height) {
          return b.height - a.height;
        }

        return b.bitrate - a.bitrate;
      });
  }

  public setQualityLevel(level: number | 'auto'): void {
    if (!this.hls) {
      return;
    }

    this.selectedQualityLevel = level;

    if (level === 'auto') {
      this.hls.currentLevel = -1;
      this.hls.nextLevel = -1;
      this.hls.loadLevel = -1;
      this.notifyQualityStateChange();
      return;
    }

    const hlsWithImmediateSwitch = this.hls as unknown as HlsWithImmediateSwitch;

    this.hls.currentLevel = level;
    this.hls.nextLevel = level;
    this.hls.loadLevel = level;
    hlsWithImmediateSwitch.nextLoadLevel = level;
    hlsWithImmediateSwitch.streamController?.immediateLevelSwitch?.();
    this.notifyQualityStateChange();
  }

  public getSelectedQualityLevel(): number | 'auto' {
    if (!this.hls) {
      return 'auto';
    }

    if (this.selectedQualityLevel === 'auto') {
      return 'auto';
    }

    const levels = Array.isArray(this.hls.levels) ? this.hls.levels : [];
    if (this.selectedQualityLevel < 0 || this.selectedQualityLevel >= levels.length) {
      return 'auto';
    }

    return this.selectedQualityLevel;
  }

  public onQualityStateChange(listener: QualityStateListener): () => void {
    this.qualityStateListeners.add(listener);

    return () => {
      this.qualityStateListeners.delete(listener);
    };
  }

  private bindHlsEvents(): void {
    if (!this.hls) {
      return;
    }

    const events: Array<keyof HlsListeners> = [
      Hls.Events.MANIFEST_PARSED,
      Hls.Events.LEVEL_LOADED,
      Hls.Events.LEVEL_SWITCHED,
      Hls.Events.LEVELS_UPDATED,
    ];

    events.forEach((eventName) => {
      const handler = (): void => {
        this.notifyQualityStateChange();
      };

      this.hls?.on(eventName, handler);
      this.hlsEventBindings.push({
        eventName,
        handler,
      });
    });
  }

  private removeHlsEventBindings(): void {
    if (!this.hls) {
      this.hlsEventBindings.length = 0;
      return;
    }

    this.hlsEventBindings.forEach(({ eventName, handler }) => {
      this.hls?.off(eventName, handler);
    });
    this.hlsEventBindings.length = 0;
  }

  private notifyQualityStateChange(): void {
    this.qualityStateListeners.forEach((listener) => {
      listener();
    });
  }
}

function formatQualityLabel(height: number, bitrate: number): string {
  if (height <= 0) {
    return 'Unknown';
  }

  const kbps = bitrate > 0 ? Math.round(bitrate / 1000) : null;
  return kbps ? `${height}p (${kbps} kbps)` : `${height}p`;
}
