'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const MINISTRY_TYPES = [
  { value: 'music_singing', label: 'Music / Singing' },
  { value: 'media_video', label: 'Media / Video Production' },
  { value: 'livestream_team', label: 'Livestream Team' },
  { value: 'youth', label: 'Youth' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'childrens', label: "Children's" },
  { value: 'other', label: 'Other' },
];

export default function SubmitMinistryForm() {
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({
    ministry_name: '',
    type: 'other',
    church_id: '',
    country_id: '',
    island_province: '',
    town: '',
    description: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    facebook: '',
    youtube: '',
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from('countries').select('id, name').order('name').then(({ data }) => setCountries(data ?? []));
    supabase.from('churches').select('id, name').order('name').then(({ data }) => setChurches(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase
      .from('ministry_submissions')
      .insert({ ...form, church_id: form.church_id || null });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p className="rounded bg-green-50 p-4 text-green-700">
        Thanks! Your ministry has been submitted for review. Once approved, we'll email you with a
        link to its page and instructions for creating an account to manage it yourself.
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
      {field('ministry_name', 'Ministry Name', true)}

      <div>
        <label className="mb-1 block text-sm font-medium">Type</label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        >
          {MINISTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Part of a Church (optional)</label>
        <select
          value={form.church_id}
          onChange={(e) => setForm({ ...form, church_id: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        >
          <option value="">— None / Independent —</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

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
      {field('town', 'Town')}

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>

      {field('contact_name', 'Your Name', true)}
      {field('email', 'Email', true)}
      {field('phone', 'Telephone')}
      {field('website', 'Website')}
      {field('facebook', 'Facebook')}
      {field('youtube', 'YouTube')}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Ministry'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">Something went wrong — please try again.</p>}
    </form>
  );
}
