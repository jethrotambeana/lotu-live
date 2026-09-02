'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function SubmitChurchForm() {
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
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
    streaming_platform: '',
    livestream_ref: '',
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
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.from('submissions').insert(form);
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p className="rounded bg-green-50 p-4 text-green-700">
        Thanks! Your church has been submitted for review. We'll be in touch once it's approved.
      </p>
    );
  }

  const field = (key: keyof typeof form, label: string, required = false) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
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
      {field('church_name', 'Church Name', true)}
      <div>
        <label className="mb-1 block text-sm font-medium">Country</label>
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
      {field('streaming_platform', 'Streaming Platform (e.g. YouTube, Cloudflare, HLS)')}
      {field('livestream_ref', 'Livestream URL or Provider ID')}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Church'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
