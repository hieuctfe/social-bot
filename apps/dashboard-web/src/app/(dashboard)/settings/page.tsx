import { PageHeader } from '@/components/ui/page-header';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your organization and workspace settings."
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        Settings coming soon.
      </div>
    </div>
  );
}
