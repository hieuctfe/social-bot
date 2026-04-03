import { PageHeader } from '@/components/ui/page-header';

export default function PublishQueuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Publish Queue & Calendar"
        description="View and manage your scheduled posts."
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        No scheduled posts yet.
      </div>
    </div>
  );
}
