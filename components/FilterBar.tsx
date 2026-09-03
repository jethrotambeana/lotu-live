'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  name: string;
  label: string;
  options: FilterOption[];
}

export default function FilterBar({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  const hasActiveFilter = filters.some((f) => searchParams.get(f.name));

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {filters.map((f) => (
        <select
          key={f.name}
          value={searchParams.get(f.name) ?? ''}
          onChange={(e) => handleChange(f.name, e.target.value)}
          className="rounded border border-slate-300 p-2 text-sm"
        >
          <option value="">{f.label}</option>
          {f.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilter && (
        <button onClick={() => router.push(pathname)} className="text-sm text-slate-500 underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
