'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TurnstileWidget from '@/components/TurnstileWidget';
import { submitEvent } from '@/app/submit-event/actions';

export default function SubmitEventForm() {
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [churches, setChurches] = useState<{ id: string; name: string }[]>([]);
  const [ministries, setMinistries] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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

    const result = await submitEvent(fd);
    if (result.success) {
      setStatus('sent');
    } else {
      setErrorMessage(result.error ?? 'Something went wrong — please try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded bg-green-50 p-4 text-green-700">
        <p>
          Thanks! Your event has been submitted for review. Once approved, we'll email you when it's
          live on the events page.
        </p>
        <p className="mt-3 text-sm">
          Note: submitting an event doesn't grant editor access to its host church or ministry —
          that's separate from listing an event. If you'd like to manage a church or ministry's own
          page (profile, events, videos), contact the site admin after signing up at{' '}
          <a href="/signup" className="underline">
            /signup
          </a>{' '}
          and ask them to grant you access.
        </p>
      </div>
    );
  }

  const field = (key: keyof typeof form, label: string, required = false, type = 'text') => (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
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
      <p className="text-xs text-slate-500">
        Fields marked <span className="text-red-600">*</span> are required.
      </p>
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

      <TurnstileWidget onVerify={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit Event'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMessage ?? 'Something went wrong — please try again.'}</p>
      )}
    </form>
  );
}
