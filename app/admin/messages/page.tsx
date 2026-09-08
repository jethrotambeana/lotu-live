import { createClient } from '@/lib/supabaseServer';
import { deleteMessage } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: messages } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  // Snapshot which were unread BEFORE marking them read below — this
  // render still shows the "New" badge for whatever was unread when the
  // admin opened the page, even though the database is updated for next
  // time. Viewing the page is the "mark as read" action, matching how the
  // messages are already shown in full inline rather than needing a
  // separate click to open each one.
  const unreadIds = (messages ?? []).filter((m: any) => !m.read).map((m: any) => m.id);
  if (unreadIds.length > 0) {
    await supabase.from('contacts').update({ read: true }).in('id', unreadIds);
  }
  const unreadSet = new Set(unreadIds);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>

      {searchParams.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      {messages && messages.length > 0 ? (
        <div className="space-y-4">
          {messages.map((m: any) => {
            const isNew = unreadSet.has(m.id);
            return (
              <div
                key={m.id}
                className={`rounded border p-4 ${
                  isNew ? 'border-sky-300 bg-sky-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="flex items-center gap-2 font-medium">
                    {isNew && (
                      <span className="rounded bg-sky-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">
                        New
                      </span>
                    )}
                    {m.subject}
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</p>
                    <form action={deleteMessage}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`Delete this message from ${m.name}? This can't be undone.`}
                        className="text-sm text-red-600 underline"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {m.name} — {m.email}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{m.message}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-slate-500">No messages yet.</p>
      )}
    </div>
  );
}
