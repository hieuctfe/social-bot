import { PageHeader } from '@/components/ui/page-header';
import { PageProfilesList } from './_components/page-profiles-list';

export default function PageProfilesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Profiles"
        description="Configure automation for each social media page. Hit Generate Now to test immediately."
      />
      <PageProfilesList />
    </div>
  );
}
