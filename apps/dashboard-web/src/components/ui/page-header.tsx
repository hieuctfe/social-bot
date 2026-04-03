import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
