import { PageHeader } from '@/components/ui/page-header';

export default function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Manage your publishing workspaces."
        action={{ label: 'New Workspace', href: '/workspaces/new' }}
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        No workspaces yet. Create your first workspace to get started.
      </div>
    </div>
  );
}
