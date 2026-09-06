'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

export default function SubmitEventForm() {
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({
    event_name: '',
    hosted_by: '',
    host_church_id: '',
    host_ministry_id: '',
    country_id: '',
    island_province: '',
    venue: '',
    town: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    description: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    facebook: '',
    youtube: '',
    poster_url: '',
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from('countries').select('id, name').order('name').then(({ data }) => setCountries(data ?? []));
    supabase.from('churches').select('id, name').order('name').then(({ data }) => setChurches(data ?? []));
    supabase.from('ministries').select('id, name').order('name').then(({ data }) => setMinistries(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.from('event_submissions').insert({
      ...form,
      host_church_id: form.host_church_id || null,
      host_ministry_id: form.host_ministry_id || null,
    });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p className="rounded bg-green-50 p-4 text-green-700">
        Thanks! Your event has been submitted for review. Once approved, we'll email you when it's
        live on the events page.
      </p>
    );
  }

  const field = (key: keyof typeof form, label: string, required = false, type = 'text') => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('event_name', 'Event Name', true)}

      <div>
        <label className="mb-1 block text-sm font-medium">Hosted by a registered Church (optional)</label>
        <select
          value={form.host_church_id}
          onChange={(e) => setForm({ ...form, host_church_id: e.target.value, host_ministry_id: '' })}
          className="w-full rounded border border-slate-300 p-2"
        >
          <option value="">— None —</option>
          {churches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Hosted by a registered Ministry (optional)</label>
        <select
          value={form.host_ministry_id}
          onChange={(e) => setForm({ ...form, host_ministry_id: e.target.value, host_church_id: '' })}
          className="w-full rounded border border-slate-300 p-2"
        >
          <option value="">— None —</option>
          {ministries.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {field('hosted_by', 'Or, organizer/host name (if not a registered church/ministry)')}

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
      {field('venue', 'Venue')}
      {field('town', 'Town')}

      <div className="grid grid-cols-2 gap-4">
        {field('start_date', 'Start Date', true, 'date')}
        {field('end_date', 'End Date', false, 'date')}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('start_time', 'Start Time', false, 'time')}
        {field('end_time', 'End Time', false, 'time')}
      </div>

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
      {field('poster_url', 'Poster Image URL')}

      <p className="text-xs text-slate-500">
        Livestream setup for this event (if any) is handled separately by an admin after approval —
        there's no need to include streaming details here.
      </p>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Event'}
      </button>
      {status === 'error' && <p className="text-sm text-red-600">Something went wrong — please try again.</p>}
    </form>
  );
}
