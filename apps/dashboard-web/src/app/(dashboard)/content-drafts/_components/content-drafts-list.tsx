'use client';
import { WORKSPACE_ID } from '@/lib/demo-config';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RefreshCw, AlertCircle, CheckCircle2, Clock, Send, Ban, FileText, Zap } from 'lucide-react';

interface ContentDraft {
  id: string;
  title: string;
  body: string;
  status: string;
  platformTargets: string[];
  createdAt: string;
  scheduledAt: string | null;
  metadata: Record<string, unknown> | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  DRAFT:            { label: 'Draft',            className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',          icon: FileText },
  PENDING_APPROVAL: { label: 'Pending',           className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  APPROVED:         { label: 'Approved',          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',     icon: CheckCircle2 },
  SCHEDULED:        { label: 'Scheduled',         className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',         icon: Send },
  PUBLISHED:        { label: 'Published',         className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Zap },
  FAILED:           { label: 'Failed',            className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',             icon: AlertCircle },
  REJECTED:         { label: 'Rejected',          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Ban },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['DRAFT']!;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function ContentDraftsList() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ContentDraft[] | { data: ContentDraft[] }>(
        `/workspaces/${WORKSPACE_ID}/content-drafts`,
      );
      setDrafts(Array.isArray(data) ? data : (data as { data: ContentDraft[] }).data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = filter === 'ALL' ? drafts : drafts.filter((d) => d.status === filter);
  const counts = drafts.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive text-sm">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'APPROVED', 'SCHEDULED', 'FAILED', 'PUBLISHED', 'DRAFT'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'ALL' ? `All (${drafts.length})` : `${s} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          No drafts with status {filter}.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((draft) => {
            const meta = draft.metadata as Record<string, unknown> | null;
            const scheduleError = meta?.scheduleError as string | undefined;
            const qaError = meta?.qaError as string | undefined;
            const errorMsg = scheduleError ?? qaError;
            const pageProfileId = meta?.pageProfileId as string | undefined;
            const qaScore = meta?.qaScore as number | undefined;

            return (
              <Link
                key={draft.id}
                href={`/content-drafts/${draft.id}`}
                className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={draft.status} />
                      {pageProfileId && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Auto
                        </span>
                      )}
                      {typeof qaScore === 'number' && (
                        <span className="text-xs text-muted-foreground">QA: {Math.round(qaScore)}</span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2 text-foreground">{draft.body}</p>
                    {errorMsg && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errorMsg}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(draft.createdAt).toLocaleString()}</span>
                      {draft.scheduledAt && (
                        <span className="text-blue-600 dark:text-blue-400">
                          → {new Date(draft.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
