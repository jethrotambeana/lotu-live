import { createClient } from '@/lib/supabaseServer';
import { SEEKABLE_PROVIDERS } from '@/lib/channelEmbed';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { addToPlaylist, removeFromPlaylist, movePlaylistItem, playVideoNow, clearOverride } from './actions';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default async function AdminChannelPage() {
  const supabase = createClient();

  const [{ data: overrideRow }, { data: playlistRows }, { data: allEligible }] = await Promise.all([
    supabase
      .from('channel_override')
      .select('video_id, started_at, videos(id, title, duration_seconds)')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('channel_playlist')
      .select('id, position, videos(id, title, provider, duration_seconds)')
      .order('position', { ascending: true }),
    supabase
      .from('videos')
      .select('id, title, provider, duration_seconds, recorded_date')
      .eq('approved', true)
      .in('provider', SEEKABLE_PROVIDERS)
      .not('duration_seconds', 'is', null)
      .order('recorded_date', { ascending: false, nullsFirst: false }),
  ]);

  const activeOverride = overrideRow?.video_id ? (overrideRow as any) : null;
  const playlist = (playlistRows ?? []).filter((row: any) => row.videos);
  const playlistVideoIds = new Set(playlist.map((row: any) => row.videos.id));
  const eligible = (allEligible ?? []).filter((v: any) => !playlistVideoIds.has(v.id));
  const playlistTotalSeconds = playlist.reduce(
    (sum: number, row: any) => sum + (row.videos.duration_seconds ?? 0),
    0
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Channel</h1>
      <p className="mb-6 text-sm text-slate-500">
        Controls for the LOTU.Live Channel — the 24/7 stream at{' '}
        <a href="/channel" className="text-sky-600 underline" target="_blank" rel="noreferrer">
          /channel
        </a>
        . It plays the playlist below on a loop, automatically cutting to any live broadcast the
        moment one starts. To set up a livestream's URL, use{' '}
        <a href="/admin/livestreams" className="text-sky-600 underline">
          Livestreams
        </a>
        .
      </p>

      <section className="mb-8 rounded border border-slate-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">Play now</h2>
        {activeOverride ? (
          <div className="flex items-center justify-between rounded bg-amber-50 p-3">
            <div>
              <span className="mr-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold uppercase text-white">
                Forced
              </span>
              <span className="font-medium">{activeOverride.videos?.title}</span>
              <p className="text-sm text-slate-500">
                Started {new Date(activeOverride.started_at).toLocaleTimeString()} — plays once,
                then the channel returns to the regular playlist (or cuts to a livestream, if one
                starts).
              </p>
            </div>
            <form action={clearOverride}>
              <button className="text-sm text-red-600 underline">Clear now</button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Nothing forced right now — the channel is playing its regular rotation. Click "Play
            now" next to any video below to interrupt it immediately for everyone watching,
            including over a live broadcast.
          </p>
        )}
      </section>

      <section className="mb-8 rounded border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Playlist ({playlist.length})</h2>
          <span className="text-sm text-slate-500">
            Total runtime: {Math.floor(playlistTotalSeconds / 60)} min
          </span>
        </div>
        {playlist.length === 0 && (
          <p className="text-sm text-slate-500">
            Empty — the channel has nothing to play until you add videos from the list below.
          </p>
        )}
        <div className="space-y-2">
          {playlist.map((row: any, index: number) => (
            <div key={row.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
              <div>
                <span className="mr-2 text-sm text-slate-400">{index + 1}.</span>
                <span className="font-medium">{row.videos.title}</span>
                <p className="text-sm text-slate-500">
                  {row.videos.provider} · {formatDuration(row.videos.duration_seconds)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form action={movePlaylistItem}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="text-sm underline disabled:text-slate-300 disabled:no-underline"
                  >
                    Move up
                  </button>
                </form>
                <form action={movePlaylistItem}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === playlist.length - 1}
                    className="text-sm underline disabled:text-slate-300 disabled:no-underline"
                  >
                    Move down
                  </button>
                </form>
                <form action={playVideoNow}>
                  <input type="hidden" name="video_id" value={row.videos.id} />
                  <button className="text-sm text-sky-600 underline">Play now</button>
                </form>
                <form action={removeFromPlaylist}>
                  <input type="hidden" name="id" value={row.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Remove "${row.videos.title}" from the channel playlist?`}
                    className="text-sm text-red-600 underline"
                  >
                    Remove
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-3 text-lg font-semibold">Add videos ({eligible.length} available)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Only approved YouTube/Cloudflare videos with a known duration can join the channel —
          Cloudinary videos and videos without a duration set aren't eligible (same requirement
          the old auto-rotation used).
        </p>
        <div className="space-y-2">
          {eligible.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
              <div>
                <span className="font-medium">{v.title}</span>
                <p className="text-sm text-slate-500">
                  {v.provider} · {formatDuration(v.duration_seconds)}
                  {v.recorded_date ? ` · ${v.recorded_date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form action={playVideoNow}>
                  <input type="hidden" name="video_id" value={v.id} />
                  <button className="text-sm text-sky-600 underline">Play now</button>
                </form>
                <form action={addToPlaylist}>
                  <input type="hidden" name="video_id" value={v.id} />
                  <button className="rounded bg-sky-600 px-3 py-1 text-sm text-white">Add to playlist</button>
                </form>
              </div>
            </div>
          ))}
          {eligible.length === 0 && (
            <p className="text-sm text-slate-500">
              No more eligible videos to add — everything eligible is already in the playlist.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
