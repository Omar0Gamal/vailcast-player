import type { HlsConfig } from 'hls.js';

export interface WatermarkConfig {
  enabled?: boolean;
  text?: string;
  jumpIntervalMs?: number;
  font?: string;
  color?: string;
}

export interface VailcastOptions {
  manifestUrl: string;
  userID: string;
  autoplay?: boolean;
  muted?: boolean;
  watermark?: WatermarkConfig;
  hlsConfig?: Partial<HlsConfig>;
}

export interface ResolvedWatermarkConfig {
  enabled: boolean;
  text: string;
  jumpIntervalMs: number;
  font: string;
  color: string;
}

export interface ResolvedVailcastOptions {
  manifestUrl: string;
  userID: string;
  autoplay: boolean;
  muted: boolean;
  watermark: ResolvedWatermarkConfig;
  hlsConfig: Partial<HlsConfig>;
}
