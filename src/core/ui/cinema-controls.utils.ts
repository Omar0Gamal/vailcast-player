import type { HlsQualityLevel } from '../hls-manager';

export const AUTO_HIDE_DELAY_MS = 2200;
export const TIMELINE_MAX = 1000;
export const MAX_PREVIEW_WIDTH = 180;
export const DEFAULT_PREVIEW_WIDTH = 176;
export const SEEK_STEP_SECONDS = 5;
export const VOLUME_STEP = 0.05;

let menuIdCounter = 0;

export function normalizeSpeedOptions(input: number[]): number[] {
  const speeds = input
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => normalizeRateValue(value));

  if (!speeds.includes(1)) {
    speeds.push(1);
  }

  const uniqueSpeeds = Array.from(new Set(speeds));
  uniqueSpeeds.sort((a, b) => a - b);
  return uniqueSpeeds;
}

export function normalizeRateValue(value: number): number {
  return Number(Number(value).toFixed(2));
}

export function trimNumericLabel(value: number): string {
  const label = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return label.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function getDuration(video: HTMLVideoElement): number {
  return Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  );
}

export function toCompactQualityLabel(level: HlsQualityLevel | null): string {
  if (!level) {
    return 'Auto';
  }

  if (level.height > 0) {
    return `${level.height}p`;
  }

  return 'Manual';
}

export function createMenuId(prefix: 'speed' | 'quality'): string {
  menuIdCounter += 1;
  return `vailcast-cinema-menu-${prefix}-${menuIdCounter}`;
}

export function resolvePreviewLeft(ratio: number, trackWidth: number, previewWidth: number): number {
  const pointerX = ratio * trackWidth;

  if (trackWidth <= 0) {
    return 0;
  }

  if (previewWidth <= 0 || trackWidth <= previewWidth) {
    return trackWidth / 2;
  }

  const halfWidth = previewWidth / 2;
  return clamp(pointerX, halfWidth, trackWidth - halfWidth);
}
