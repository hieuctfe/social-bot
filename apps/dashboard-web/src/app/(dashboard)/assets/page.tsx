import { PageHeader } from '@/components/ui/page-header';

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Manage your media files and uploads."
        action={{ label: 'Upload Asset', href: '/assets/upload' }}
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        No assets uploaded yet.
      </div>
    </div>
  );
}
