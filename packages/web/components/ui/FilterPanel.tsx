'use client';

import { Button } from './Button';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterPanelProps {
  fields: FilterField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FilterPanel({ fields, values, onChange, onApply, onReset }: FilterPanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={values[f.name] ?? ''}
                onChange={(e) => onChange(f.name, e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">All</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === 'date' ? 'date' : 'text'}
                value={values[f.name] ?? ''}
                onChange={(e) => onChange(f.name, e.target.value)}
                placeholder={f.placeholder}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={onApply}>Apply</Button>
        <Button variant="secondary" onClick={onReset}>Reset</Button>
      </div>
    </div>
  );
}
