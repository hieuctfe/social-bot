import { PageHeader } from '@/components/ui/page-header';
import { SocialConnectionsList } from './_components/social-connections-list';

export default function SocialConnectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Connections"
        description="Manage your connected social media accounts."
      />
      <SocialConnectionsList />
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Connect new accounts through Postiz
        </p>
        <a
          href="http://localhost:4200"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open Postiz
        </a>
      </div>
    </div>
  );
}
