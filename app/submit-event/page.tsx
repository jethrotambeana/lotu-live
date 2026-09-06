import SubmitEventForm from '@/components/SubmitEventForm';

export default function SubmitEventPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Add Your Event to LOTU.LIVE</h1>
      <p className="mb-6 text-slate-600">
        Submit details for a Music Night, Youth Program, Evangelistic Meeting, or any other event.
        Your submission stays private until an administrator reviews and approves it.
      </p>
      <SubmitEventForm />
    </div>
  );
}
