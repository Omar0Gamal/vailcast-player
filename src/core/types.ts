import type { HlsConfig } from 'hls.js';

export interface WatermarkConfig {
  enabled?: boolean;
  text?: string;
  jumpIntervalMs?: number;
  font?: string;
  color?: string;
}

export type PlayerUiMode = 'headless' | 'cinema';

export interface PlayerUiInputThemeConfig {
  accentColor?: string;
  trackColor?: string;
  focusColor?: string;
  selectedColor?: string;
}

export interface PlayerUiConfig {
  mode?: PlayerUiMode;
  controls?: boolean;
  speedOptions?: number[];
  previewVttUrl?: string;
  attemptPreviewVtt?: boolean;
  inputTheme?: PlayerUiInputThemeConfig;
}

export interface PlayerSecurityConfig {
  lockUserID?: boolean;
}

export interface VailcastOptions {
  manifestUrl: string;
  userID: string;
  autoplay?: boolean;
  muted?: boolean;
  ui?: PlayerUiConfig;
  security?: PlayerSecurityConfig;
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
  ui: ResolvedPlayerUiConfig;
  security: ResolvedPlayerSecurityConfig;
  watermark: ResolvedWatermarkConfig;
  hlsConfig: Partial<HlsConfig>;
}

export interface ResolvedPlayerUiInputThemeConfig {
  accentColor: string;
  trackColor: string;
  focusColor: string;
  selectedColor: string;
}

export interface ResolvedPlayerUiConfig {
  mode: PlayerUiMode;
  controls: boolean;
  speedOptions: number[];
  previewVttUrl: string | null;
  attemptPreviewVtt: boolean;
  inputTheme: ResolvedPlayerUiInputThemeConfig;
}

export interface ResolvedPlayerSecurityConfig {
  lockUserID: boolean;
}
