import { afterAll, afterEach, beforeAll, vi } from 'vitest';

vi.mock('hls.js', () => {
  class MockHls {
    public static isSupported(): boolean {
      return true;
    }

    public loadSource = vi.fn();
    public attachMedia = vi.fn();
    public destroy = vi.fn();
  }

  return {
    default: MockHls,
  };
});

const mockCanvasContext = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 160 } as TextMetrics)),
  save: vi.fn(),
  restore: vi.fn(),
  font: '',
  fillStyle: '',
  textBaseline: 'top' as CanvasTextBaseline,
} as unknown as CanvasRenderingContext2D;

beforeAll(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    ((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(performance.now()), 1) as unknown as number;
    }) as typeof requestAnimationFrame,
  );

  vi.stubGlobal(
    'cancelAnimationFrame',
    ((id: number) => {
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    }) as typeof cancelAnimationFrame,
  );

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => mockCanvasContext),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});
