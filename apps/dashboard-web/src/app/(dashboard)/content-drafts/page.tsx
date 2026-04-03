import { PageHeader } from '@/components/ui/page-header';
import { ContentDraftsList } from './_components/content-drafts-list';

export default function ContentDraftsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Drafts"
        description="Create and manage content drafts before publishing."
        action={{ label: 'New Draft', href: '/content-drafts/new' }}
      />
      <ContentDraftsList />
    </div>
  );
}
