import { describe, expect, it } from 'vitest';
import {
  buildPreviewVttUrlCandidates,
  findTimelinePreviewCue,
  parseTimelinePreviewTrack,
} from '../src/core/ui/vtt-preview';

describe('timeline preview VTT parsing', () => {
  it('parses cue image URLs relative to source', () => {
    const track = parseTimelinePreviewTrack(
      `WEBVTT\n\n00:00:00.000 --> 00:00:10.000\nframe-01.jpg\n\n00:00:10.001 --> 00:00:20.000\nframe-02.jpg`,
      'https://cdn.example.com/previews/demo.vtt',
    );

    expect(track).not.toBeNull();
    expect(track?.cues).toHaveLength(2);
    expect(track?.cues[0]?.imageUrl).toBe('https://cdn.example.com/previews/frame-01.jpg');

    const cueAt15s = findTimelinePreviewCue(track, 15);
    expect(cueAt15s?.imageUrl).toBe('https://cdn.example.com/previews/frame-02.jpg');
  });

  it('parses sprite coordinates from cue fragments', () => {
    const track = parseTimelinePreviewTrack(
      `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nsprite.jpg#xywh=160,0,160,90`,
      'https://cdn.example.com/previews/demo.vtt',
    );

    expect(track).not.toBeNull();
    expect(track?.cues[0]?.sprite).toEqual({
      x: 160,
      y: 0,
      width: 160,
      height: 90,
    });
  });

  it('parses sprite coordinates when fragment uses pixel prefix', () => {
    const track = parseTimelinePreviewTrack(
      `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nsprite.jpg#xywh=pixel:320,90,160,90`,
      'https://cdn.example.com/previews/demo.vtt',
    );

    expect(track).not.toBeNull();
    expect(track?.cues[0]?.sprite).toEqual({
      x: 320,
      y: 90,
      width: 160,
      height: 90,
    });
  });

  it('parses sprite coordinates when fragment has multiple parameters', () => {
    const track = parseTimelinePreviewTrack(
      `WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nsprite.jpg#token=abc&xywh=480,180,160,90`,
      'https://cdn.example.com/previews/demo.vtt',
    );

    expect(track).not.toBeNull();
    expect(track?.cues[0]?.sprite).toEqual({
      x: 480,
      y: 180,
      width: 160,
      height: 90,
    });
  });

  it('returns the closest available cue when hover time falls between ranges', () => {
    const track = parseTimelinePreviewTrack(
      `WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nframe-01.jpg\n\n00:00:10.000 --> 00:00:14.000\nframe-02.jpg`,
      'https://cdn.example.com/previews/demo.vtt',
    );

    expect(track).not.toBeNull();
    expect(findTimelinePreviewCue(track, -1)?.imageUrl).toBe('https://cdn.example.com/previews/frame-01.jpg');
    expect(findTimelinePreviewCue(track, 7)?.imageUrl).toBe('https://cdn.example.com/previews/frame-01.jpg');
    expect(findTimelinePreviewCue(track, 99)?.imageUrl).toBe('https://cdn.example.com/previews/frame-02.jpg');
  });

  it('builds fallback VTT URL candidates for common preview filenames', () => {
    const candidates = buildPreviewVttUrlCandidates('https://cdn.example.com/media/index.vtt');

    expect(candidates).toEqual([
      'https://cdn.example.com/media/index.vtt',
      'https://cdn.example.com/media/previews.vtt',
      'https://cdn.example.com/media/preview.vtt',
    ]);
  });
});
