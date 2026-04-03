'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface ContentDraft {
  id: string;
  title: string;
  body: string;
  status: string;
  platformTargets: string[];
  createdAt: string;
  scheduledAt: string | null;
}

// For demo purposes, using a hardcoded token
// In production, this would come from auth context/session
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5pZ2gzOXgwMDA0MTFmcmFwYnBpeWhrIiwiZW1haWwiOiJhZG1pbkBzb2NpYWxib3QubG9jYWwiLCJvcmdhbml6YXRpb25JZCI6ImNtbmlnaDM5dDAwMDAxMWZyODllYWV6OHgiLCJpYXQiOjE3NzUxOTgzMTAsImV4cCI6MTc3NTgwMzExMH0.cG-MsIY4TWysGPzP0CVIsawhfrT7idm0I3HK_Lq9GIw';
const WORKSPACE_ID = 'cmnigh39v000211fr0uvwigx5';

export function ContentDraftsList() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDrafts() {
      try {
        const data = await apiClient.get<ContentDraft[]>(
          `/workspaces/${WORKSPACE_ID}/content-drafts`,
          DEMO_TOKEN
        );
        setDrafts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drafts');
      } finally {
        setLoading(false);
      }
    }

    fetchDrafts();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Loading drafts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive">
        Error: {error}
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        No content drafts yet. Create your first draft to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => (
        <Link
          key={draft.id}
          href={`/content-drafts/${draft.id}`}
          className="block rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{draft.title}</h3>
                <StatusBadge status={draft.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {draft.body}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Platforms: {draft.platformTargets.join(', ')}</span>
                <span>Created: {new Date(draft.createdAt).toLocaleDateString()}</span>
                {draft.scheduledAt && (
                  <span>Scheduled: {new Date(draft.scheduledAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status as keyof typeof colors] || colors.DRAFT}`}>
      {status}
    </span>
  );
}
