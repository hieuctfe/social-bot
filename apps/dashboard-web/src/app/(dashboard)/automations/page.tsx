import { PageHeader } from '@/components/ui/page-header';

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Manage n8n workflows and automation runs."
        action={{ label: 'Open n8n', href: process.env['NEXT_PUBLIC_N8N_URL'] ?? '#' }}
      />
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        No automation runs yet.
      </div>
    </div>
  );
}
