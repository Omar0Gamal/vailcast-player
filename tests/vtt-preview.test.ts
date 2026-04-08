import { describe, expect, it } from 'vitest';
import { findTimelinePreviewCue, parseTimelinePreviewTrack } from '../src/core/ui/vtt-preview';

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
});
