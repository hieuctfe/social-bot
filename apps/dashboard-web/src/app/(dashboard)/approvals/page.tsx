import { PageHeader } from '@/components/ui/page-header';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve content drafts before publishing."
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        No pending approvals.
      </div>
    </div>
  );
}
