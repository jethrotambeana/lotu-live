'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const supabase = createClient();

    // Reuses the same /auth/confirm route built for signup confirmation —
    // Supabase's recovery link uses the same token_hash/type pattern, just
    // with type=recovery, and that route already handles any `type` value
    // generically. Only the destination differs (/reset-password here,
    // not /login), controlled entirely via this `next` param.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setStatus('error');
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold">Check your email</h1>
        <p className="text-slate-600">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your
          password. Click it to choose a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Forgot Password</h1>
      <p className="mb-6 text-sm text-slate-500">
        Enter the email address on your account and we'll send you a link to reset your password.
      </p>
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
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-500">
        <a href="/login" className="underline">
          Back to login
        </a>
      </p>
    </div>
  );
}
