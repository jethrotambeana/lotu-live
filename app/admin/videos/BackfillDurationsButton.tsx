'use client';

import { useState } from 'react';
import { backfillVideoDurations } from './actions';

export default function BackfillDurationsButton() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<{ processed: number; updated: number; remaining: number } | null>(null);

  async function handleClick() {
    setStatus('running');
    const res = await backfillVideoDurations();
    setResult(res);
    setStatus('done');
  }

  return (
    <div className="rounded border border-slate-200 p-3 text-sm">
      <p className="mb-2 text-slate-600">
        One-time catch-up for videos saved before duration tracking existed — needed for the
        LOTU.Live Channel feature. Processes up to 20 at a time; click again if any remain.
      </p>
      <button
        onClick={handleClick}
        disabled={status === 'running'}
        className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
      >
        {status === 'running' ? 'Looking up durations...' : 'Backfill Missing Durations'}
      </button>
      {result && (
        <p className="mt-2 text-slate-500">
          Checked {result.processed}, updated {result.updated}.{' '}
          {result.remaining > 0 ? `${result.remaining} still remaining — click again.` : 'All caught up!'}
        </p>
      )}
    </div>
  );
}
