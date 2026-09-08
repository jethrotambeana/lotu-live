'use client';

import { useState } from 'react';
import { submitContactMessage } from '@/app/contact/actions';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({ name: '', email: '', country: '', subject: '', message: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');

    const formData = new FormData();
    formData.set('name', form.name);
    formData.set('email', form.email);
    formData.set('country', form.country);
    formData.set('subject', form.subject);
    formData.set('message', form.message);

    const result = await submitContactMessage(formData);
    setStatus(result?.error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return (
      <p className="rounded bg-green-50 p-4 text-green-700">
        Thanks — your message has been sent. We'll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Country</label>
        <input
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Subject</label>
        <input
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Message</label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded border border-slate-300 p-2"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded bg-sky-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {status === 'submitting' ? 'Sending...' : 'Send Message'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-600">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
