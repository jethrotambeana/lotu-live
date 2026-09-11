'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TurnstileWidget from '@/components/TurnstileWidget';
import { submitChurch } from '@/app/submit/actions';

export default function SubmitChurchForm() {
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [form, setForm] = useState({
    church_name: '',
    country_id: '',
    island_province: '',
    location: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    facebook: '',
    youtube: '',
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('countries')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCountries(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!turnstileToken) {
      setErrorMessage('Please complete the verification above before submitting.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage(null);

    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    fd.append('turnstileToken', turnstileToken);

    const result = await submitChurch(fd);
    if (result.success) {
      setStatus('sent');
    } else {
      setErrorMessage(result.error ?? 'Something went wrong — please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <p className="rounded bg-green-50 p-4 text-green-700">
        Thanks! Your church has been submitted for review. Once approved, we'll email you with a
        link to your church's page and instructions for creating an account to manage it yourself.
      </p>
    );
  }

  const field = (key: keyof typeof form, label: string, required = false) => (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-slate-500">
        Fields marked <span className="text-red-600">*</span> are required.
      </p>
      {field('church_name', 'Church Name', true)}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Country<span className="text-red-600"> *</span>
        </label>
        <select
          required
          value={form.country_id}
          onChange={(e) => setForm({ ...form, country_id: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        >
          <option value="">Select a country</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {field('island_province', 'Island / Province')}
      {field('location', 'Town / Location')}
      {field('contact_name', 'Pastor or Media Contact', true)}
      {field('email', 'Email', true)}
      {field('phone', 'Telephone')}
      {field('website', 'Website')}
      {field('facebook', 'Facebook')}
      {field('youtube', 'YouTube')}
      <p className="text-xs text-slate-500">
        Livestream setup happens after your church is approved — we'll reach out separately
        with streaming details, so there's no need to include that here.
      </p>

      <TurnstileWidget onVerify={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Church'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMessage ?? 'Something went wrong — please try again.'}</p>
      )}
    </form>
  );
}
