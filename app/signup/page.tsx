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
          We sent a confirmation link to <strong>{email}</strong>. Click it, then ask an existing
          admin to grant you access — or if this is the very first account, run this in
          Supabase's SQL Editor (find your user ID under Authentication → Users):
        </p>
        <pre className="mt-4 overflow-x-auto rounded bg-slate-100 p-3 text-xs">
{`insert into profiles (id, role) values ('YOUR-USER-UUID', 'admin');`}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Create Admin Account</h1>
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
