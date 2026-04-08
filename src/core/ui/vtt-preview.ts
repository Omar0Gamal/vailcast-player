export interface TimelinePreviewSprite {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimelinePreviewCue {
  startTime: number;
  endTime: number;
  imageUrl: string;
  sprite: TimelinePreviewSprite | null;
}

export interface TimelinePreviewTrack {
  sourceUrl: string;
  cues: TimelinePreviewCue[];
}

export async function loadTimelinePreviewTrack(
  vttUrl: string,
  signal?: AbortSignal,
): Promise<TimelinePreviewTrack | null> {
  try {
    const response = await fetch(vttUrl, {
      mode: 'cors',
      credentials: 'omit',
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const vttText = await response.text();
    return parseTimelinePreviewTrack(vttText, vttUrl);
  } catch {
    return null;
  }
}

export function parseTimelinePreviewTrack(vttText: string, sourceUrl: string): TimelinePreviewTrack | null {
  const normalized = vttText.replace(/\uFEFF/g, '').replace(/\r/g, '');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: TimelinePreviewCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      continue;
    }

    if (lines[0]?.startsWith('WEBVTT') || lines[0]?.startsWith('NOTE')) {
      continue;
    }

    const timingLineIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingLineIndex < 0) {
      continue;
    }

    const timingLine = lines[timingLineIndex];
    const payload = lines[timingLineIndex + 1] ?? '';
    const timing = parseTimingLine(timingLine);
    if (!timing || !payload) {
      continue;
    }

    const cue = parseCuePayload(payload, sourceUrl);
    if (!cue) {
      continue;
    }

    cues.push({
      startTime: timing.startTime,
      endTime: timing.endTime,
      imageUrl: cue.imageUrl,
      sprite: cue.sprite,
    });
  }

  if (cues.length === 0) {
    return null;
  }

  cues.sort((a, b) => a.startTime - b.startTime);
  return {
    sourceUrl,
    cues,
  };
}

export function findTimelinePreviewCue(
  track: TimelinePreviewTrack | null,
  time: number,
): TimelinePreviewCue | null {
  if (!track || track.cues.length === 0) {
    return null;
  }

  for (const cue of track.cues) {
    if (time >= cue.startTime && time <= cue.endTime) {
      return cue;
    }
  }

  return null;
}

function parseTimingLine(line: string): { startTime: number; endTime: number } | null {
  const [startRaw, endRaw] = line.split('-->').map((part) => part.trim());
  if (!startRaw || !endRaw) {
    return null;
  }

  const startTime = parseTimestamp(startRaw.split(' ')[0] ?? '');
  const endTime = parseTimestamp(endRaw.split(' ')[0] ?? '');

  if (startTime === null || endTime === null || endTime <= startTime) {
    return null;
  }

  return {
    startTime,
    endTime,
  };
}

function parseTimestamp(value: string): number | null {
  const parts = value.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const secondsPart = parts.pop();
  const minutesPart = parts.pop();
  const hoursPart = parts.length > 0 ? parts.pop() : '0';

  if (!secondsPart || !minutesPart || !hoursPart) {
    return null;
  }

  const seconds = Number(secondsPart);
  const minutes = Number(minutesPart);
  const hours = Number(hoursPart);

  if (!Number.isFinite(seconds) || !Number.isFinite(minutes) || !Number.isFinite(hours)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function parseCuePayload(
  payload: string,
  sourceUrl: string,
): { imageUrl: string; sprite: TimelinePreviewSprite | null } | null {
  const [imagePart, fragmentPart] = payload.trim().split('#', 2);
  if (!imagePart) {
    return null;
  }

  const imageUrl = resolveAssetUrl(imagePart, sourceUrl);
  if (!imageUrl) {
    return null;
  }

  const sprite = parseSprite(fragmentPart ?? null);

  return {
    imageUrl,
    sprite,
  };
}

function resolveAssetUrl(assetUrl: string, sourceUrl: string): string | null {
  try {
    return new URL(assetUrl, sourceUrl).toString();
  } catch {
    return null;
  }
}

function parseSprite(fragment: string | null): TimelinePreviewSprite | null {
  if (!fragment || !fragment.startsWith('xywh=')) {
    return null;
  }

  const [xRaw, yRaw, widthRaw, heightRaw] = fragment
    .slice('xywh='.length)
    .split(',')
    .map((part) => Number(part.trim()));

  if (
    !Number.isFinite(xRaw) ||
    !Number.isFinite(yRaw) ||
    !Number.isFinite(widthRaw) ||
    !Number.isFinite(heightRaw)
  ) {
    return null;
  }

  return {
    x: xRaw,
    y: yRaw,
    width: widthRaw,
    height: heightRaw,
  };
}
