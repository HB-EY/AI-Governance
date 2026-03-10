import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
