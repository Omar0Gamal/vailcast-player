import { describe, expect, it, vi } from 'vitest';
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
  it('defaults to headless mode with no controls', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    const video = host.querySelector('video');

    expect(host.classList.contains('vailcast-player--ui-headless')).toBe(true);
    expect(host.classList.contains('vailcast-player--ui-cinema')).toBe(false);
    expect(video?.controls).toBe(false);
    expect(host.querySelector('.vailcast-cinema-ui')).toBeNull();

    player.destroy();
  });

  it('supports cinema mode theme updates', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    player.updateOptions({
      ui: {
        mode: 'cinema',
        speedOptions: [0.5, 1, 1.5, 2],
        attemptPreviewVtt: false,
        inputTheme: {
          accentColor: 'rgb(255, 0, 0)',
          focusColor: 'rgb(0, 255, 0)',
          trackColor: 'rgb(0, 0, 255)',
          selectedColor: 'rgb(255, 255, 0)',
        },
      },
    });

    const cinemaUi = host.querySelector<HTMLElement>('.vailcast-cinema-ui');

    expect(host.classList.contains('vailcast-player--ui-cinema')).toBe(true);
    expect(cinemaUi).not.toBeNull();
    expect(cinemaUi?.style.getPropertyValue('--vailcast-input-accent')).toBe('rgb(255, 0, 0)');
    expect(cinemaUi?.style.getPropertyValue('--vailcast-input-focus')).toBe('rgb(0, 255, 0)');
    expect(cinemaUi?.style.getPropertyValue('--vailcast-input-track')).toBe('rgb(0, 0, 255)');
    expect(cinemaUi?.style.getPropertyValue('--vailcast-input-selected')).toBe('rgb(255, 255, 0)');

    player.destroy();
  });

  it('keeps userID immutable after initialization', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    expect(() => {
      player.updateOptions({ userID: 'user-456' });
    }).toThrow(/locked/i);

    expect(() => {
      player.updateOptions({ userID: 'user-123' });
    }).not.toThrow();

    player.destroy();
  });

  it('is safe to destroy more than once', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, createOptions());

    player.destroy();

    expect(() => player.destroy()).not.toThrow();
  });

  it('handles play failures in cinema controls without throwing runtime errors', async () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(
      host,
      createOptions({
        ui: {
          mode: 'cinema',
          attemptPreviewVtt: false,
        },
      }),
    );

    const video = host.querySelector('video');
    expect(video).not.toBeNull();

    Object.defineProperty(video as HTMLVideoElement, 'play', {
      configurable: true,
      value: vi
        .fn()
        .mockRejectedValue(new DOMException('The element has no supported sources.', 'NotSupportedError')),
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally swallowed in test.
    });
    const errorEventSpy = vi.fn();
    host.addEventListener('vailcast:playback-error', errorEventSpy as EventListener);

    const playButton = host.querySelector<HTMLButtonElement>('.vailcast-cinema-ui__button[aria-label="Play"]');
    expect(playButton).not.toBeNull();

    playButton?.click();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorEventSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    player.destroy();
  });
});
