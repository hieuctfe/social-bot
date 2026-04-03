import { PageHeader } from '@/components/ui/page-header';
import { NewDraftForm } from '../_components/new-draft-form';

export default function NewDraftPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Content Draft"
        description="Create a new content draft for social media publishing."
      />
      <div className="mx-auto max-w-2xl">
        <NewDraftForm />
      </div>
    </div>
  );
}
