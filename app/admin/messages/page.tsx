import { createClient } from '@/lib/supabaseServer';

export default async function AdminMessagesPage() {
  const supabase = createClient();
  const { data: messages } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      {messages && messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{m.subject}</p>
                <p className="text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                {m.name} — {m.email}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{m.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No messages yet.</p>
      )}
    </div>
  );
}
