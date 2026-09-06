'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
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
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-slate-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it to confirm your
          account.
        </p>
        <p className="mt-3 text-slate-600">
          If this account is for managing a church, event, or ministry you've submitted, an
          administrator will activate it once your submission is approved — you'll get a separate
          email when that's ready.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'submitting' ? 'Creating...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
