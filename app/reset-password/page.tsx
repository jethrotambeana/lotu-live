'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // /auth/confirm already verified the recovery token and set the
    // session server-side (via cookies) before redirecting here — this
    // just confirms that session is actually readable client-side before
    // showing the form. If someone lands on this page directly, or the
    // link was invalid/expired, there's no session and nothing to update.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
      setChecked(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setStatus('error');
      return;
    }
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold">Password updated</h1>
        <p className="mb-6 text-slate-600">Your password has been changed. You can now log in.</p>
        <a href="/login" className="text-sky-600 underline">
          Go to login
        </a>
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold">Reset Password</h1>
        <p className="text-slate-500">Checking your link…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold">Reset Password</h1>
        <p className="text-slate-600">
          This link is invalid or has expired.{' '}
          <a href="/forgot-password" className="text-sky-600 underline">
            Request a new one
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Choose a New Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'submitting' ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
