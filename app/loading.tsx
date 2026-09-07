export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
