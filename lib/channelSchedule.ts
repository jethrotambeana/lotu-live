// Deterministic "what's playing right now" for the LOTU.Live Channel.
// No always-running process needed — since the playlist order and each
// video's exact duration are both fixed and known in advance, "what's
// currently on and at what timestamp" is a pure function of the current
// time. Every visitor's page load computes this fresh and gets the same
// answer, which is what makes the shared/synced viewing experience
// possible without any server-side broadcasting infrastructure.

export interface ChannelVideo {
  id: string;
  slug: string;
  title: string;
  provider: string;
  provider_video_id: string;
  duration_seconds: number;
}

export interface CurrentSegment {
  video: ChannelVideo;
  offsetSeconds: number;
  segmentEndsAt: Date;
}

// Simple deterministic PRNG (mulberry32) — same seed always produces the
// same sequence. Used only to shuffle the day's playlist order, nothing
// security-sensitive.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDateString(dateString: string): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash * 31 + dateString.charCodeAt(i)) | 0;
  }
  return hash;
}

// Reshuffles once per UTC calendar day — stable for everyone watching
// that day (same seed -> same order for all viewers), gives variety day
// to day. Fully reproducible from the date string alone; no stored state
// required anywhere.
export function shuffleForDay<T>(items: T[], dateString: string): T[] {
  const rng = mulberry32(seedFromDateString(dateString));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function computeCurrentSegment(videos: ChannelVideo[], now: Date = new Date()): CurrentSegment | null {
  if (videos.length === 0) return null;

  const utcDateString = now.toISOString().slice(0, 10); // e.g. "2026-09-12"
  const playlist = shuffleForDay(videos, utcDateString);

  const totalDuration = playlist.reduce((sum, v) => sum + v.duration_seconds, 0);
  if (totalDuration <= 0) return null;

  const dayStart = new Date(`${utcDateString}T00:00:00.000Z`);
  const elapsedToday = (now.getTime() - dayStart.getTime()) / 1000;
  // Double-mod guards against a negative result from floating point edge
  // cases right at the day boundary.
  const loopedElapsed = ((elapsedToday % totalDuration) + totalDuration) % totalDuration;

  let cumulative = 0;
  for (const video of playlist) {
    const segmentStart = cumulative;
    const segmentEnd = cumulative + video.duration_seconds;
    if (loopedElapsed < segmentEnd) {
      const offsetSeconds = Math.floor(loopedElapsed - segmentStart);
      const segmentEndsAt = new Date(now.getTime() + (segmentEnd - loopedElapsed) * 1000);
      return { video, offsetSeconds, segmentEndsAt };
    }
    cumulative = segmentEnd;
  }

  // Shouldn't be reachable given the modulo above, but fall back to the
  // first video rather than ever returning nothing for a non-empty list.
  return {
    video: playlist[0],
    offsetSeconds: 0,
    segmentEndsAt: new Date(now.getTime() + playlist[0].duration_seconds * 1000),
  };
}
