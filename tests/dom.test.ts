import { describe, expect, it } from 'vitest';
import { VailcastPlayer } from '../src';

describe('VailcastPlayer DOM integration', () => {
  it('injects and removes video/canvas nodes', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, {
      manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      userID: 'dom-user',
    });

    expect(host.querySelector('video')).not.toBeNull();
    expect(host.querySelector('canvas')).not.toBeNull();

    player.destroy();

    expect(host.querySelector('video')).toBeNull();
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('adds player class to host container', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, {
      manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      userID: 'dom-user',
    });

    expect(host.classList.contains('vailcast-player')).toBe(true);

    player.destroy();
  });

  it('defaults to headless mode', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, {
      manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      userID: 'dom-user',
    });

    const video = host.querySelector('video');

    expect(host.classList.contains('vailcast-player--ui-headless')).toBe(true);
    expect(host.classList.contains('vailcast-player--ui-cinema')).toBe(false);
    expect(video?.controls).toBe(false);

    player.destroy();
  });

  it('enables cinema mode custom controls', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, {
      manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      userID: 'dom-user',
      ui: {
        mode: 'cinema',
        attemptPreviewVtt: false,
      },
    });

    const video = host.querySelector('video');

    expect(host.classList.contains('vailcast-player--ui-headless')).toBe(false);
    expect(host.classList.contains('vailcast-player--ui-cinema')).toBe(true);
    expect(video?.controls).toBe(false);
    expect(host.querySelector('.vailcast-cinema-ui')).not.toBeNull();

    player.destroy();
  });

  it('supports toggling between headless and cinema mode', () => {
    const host = document.createElement('div');
    const player = new VailcastPlayer(host, {
      manifestUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      userID: 'dom-user',
    });

    player.updateOptions({
      ui: {
        mode: 'cinema',
        attemptPreviewVtt: false,
      },
    });

    const video = host.querySelector('video');

    expect(host.classList.contains('vailcast-player--ui-headless')).toBe(false);
    expect(host.classList.contains('vailcast-player--ui-cinema')).toBe(true);
    expect(video?.controls).toBe(false);
    expect(host.querySelector('.vailcast-cinema-ui')).not.toBeNull();

    player.destroy();
  });
});
