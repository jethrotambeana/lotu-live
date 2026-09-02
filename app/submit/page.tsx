import SubmitChurchForm from '@/components/SubmitChurchForm';

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Add Your Church to LOTU.LIVE</h1>
      <p className="mb-6 text-slate-600">
        Submit your church's details below. Your submission stays private until an administrator
        reviews and approves it.
      </p>
      <SubmitChurchForm />
    </div>
  );
}
