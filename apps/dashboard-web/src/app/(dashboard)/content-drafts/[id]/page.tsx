import { PageHeader } from '@/components/ui/page-header';
import { DraftDetail } from '../_components/draft-detail';

export default function DraftDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Draft"
        description="Review and manage your content draft."
      />
      <DraftDetail draftId={params.id} />
    </div>
  );
}
