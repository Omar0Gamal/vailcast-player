import { describe, expect, it } from 'vitest';
import { VailcastPlayer } from '../src';
import type { VailcastOptions } from '../src';

function createOptions(partial: Partial<VailcastOptions> = {}): VailcastOptions {
  return {
    manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    userID: 'user-123',
    ...partial,
  };
}

describe('VailcastPlayer core behavior', () => {
  it('merges default options', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    const internals = player as unknown as {
      options: {
        watermark: {
          enabled: boolean;
          text: string;
          jumpIntervalMs: number;
        };
      };
    };

    expect(internals.options.watermark.enabled).toBe(true);
    expect(internals.options.watermark.text).toBe('ID: user-123');
    expect(internals.options.watermark.jumpIntervalMs).toBe(5000);

    player.destroy();
  });

  it('supports option updates after initialization', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    player.updateOptions({
      userID: 'user-456',
      watermark: {
        text: 'ID: custom',
        jumpIntervalMs: 1000,
      },
    });

    const internals = player as unknown as {
      options: {
        userID: string;
        watermark: {
          text: string;
          jumpIntervalMs: number;
        };
      };
    };

    expect(internals.options.userID).toBe('user-456');
    expect(internals.options.watermark.text).toBe('ID: custom');
    expect(internals.options.watermark.jumpIntervalMs).toBe(1000);

    player.destroy();
  });

  it('is safe to destroy more than once', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    player.destroy();

    expect(() => player.destroy()).not.toThrow();
  });
});
