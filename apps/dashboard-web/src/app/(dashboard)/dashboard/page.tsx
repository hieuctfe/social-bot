import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { LayoutDashboard, Users, Send, Clock } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Welcome to the Social Bot control dashboard."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Workspaces" value="—" icon={LayoutDashboard} />
        <StatCard title="Social Connections" value="—" icon={Users} />
        <StatCard title="Published This Week" value="—" icon={Send} />
        <StatCard title="Pending Approvals" value="—" icon={Clock} />
      </div>
      <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground text-sm">
        Connect your first workspace and social accounts to get started.
      </div>
    </div>
  );
}
