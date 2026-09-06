import SubmitMinistryForm from '@/components/SubmitMinistryForm';

export default function SubmitMinistryPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Add Your Ministry to LOTU.LIVE</h1>
      <p className="mb-6 text-slate-600">
        List a singing group, video production team, livestream ministry, youth group, or any other
        ministry. Your submission stays private until an administrator reviews and approves it.
      </p>
      <SubmitMinistryForm />
    </div>
  );
}
