'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5pZ2gzOXgwMDA0MTFmcmFwYnBpeWhrIiwiZW1haWwiOiJhZG1pbkBzb2NpYWxib3QubG9jYWwiLCJvcmdhbml6YXRpb25JZCI6ImNtbmlnaDM5dDAwMDAxMWZyODllYWV6OHgiLCJpYXQiOjE3NzUxOTgzMTAsImV4cCI6MTc3NTgwMzExMH0.cG-MsIY4TWysGPzP0CVIsawhfrT7idm0I3HK_Lq9GIw';
const WORKSPACE_ID = 'cmnigh39v000211fr0uvwigx5';

interface ContentDraft {
  id: string;
  title: string;
  body: string;
  status: string;
  platformTargets: string[];
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

interface DraftDetailProps {
  draftId: string;
}

export function DraftDetail({ draftId }: DraftDetailProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    async function fetchDraft() {
      try {
        const data = await apiClient.get<ContentDraft>(
          `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}`,
          DEMO_TOKEN
        );
        setDraft(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft');
      } finally {
        setLoading(false);
      }
    }

    fetchDraft();
  }, [draftId]);

  const handleQuickSchedule = async () => {
    if (!draft) return;

    if (draft.status === 'SCHEDULED') {
      setError('This draft is already scheduled!');
      return;
    }

    setScheduling(true);
    setError(null);

    try {
      const updated = await apiClient.post<ContentDraft>(
        `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}/quick-schedule`,
        {},
        DEMO_TOKEN
      );

      setDraft(updated);
      setError(null);
      // Success notification will be shown by the updated status badge
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Loading draft...
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive">
        Error: {error}
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Draft not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{draft.title}</h2>
            <StatusBadge status={draft.status} />
          </div>
          <div className="flex gap-2">
            {draft.status === 'DRAFT' && (
              <button
                onClick={handleQuickSchedule}
                disabled={scheduling}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {scheduling ? 'Scheduling...' : 'Quick Schedule'}
              </button>
            )}
            {draft.status === 'SCHEDULED' && (
              <Link
                href="http://localhost:4200"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View in Postiz
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Content</h3>
            <p className="whitespace-pre-wrap text-sm">{draft.body}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Target Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {draft.platformTargets.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span className="font-medium">
                {new Date(draft.createdAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{' '}
              <span className="font-medium">
                {new Date(draft.updatedAt).toLocaleString()}
              </span>
            </div>
            {draft.scheduledAt && (
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                <span className="font-medium">
                  {new Date(draft.scheduledAt).toLocaleString()}
                </span>
              </div>
            )}
            {draft.publishedAt && (
              <div>
                <span className="text-muted-foreground">Published:</span>{' '}
                <span className="font-medium">
                  {new Date(draft.publishedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push('/content-drafts')}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to Drafts
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    PUBLISHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colors[status as keyof typeof colors] || colors.DRAFT}`}>
      {status}
    </span>
  );
}
