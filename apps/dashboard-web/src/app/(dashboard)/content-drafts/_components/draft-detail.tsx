'use client';
import { WORKSPACE_ID } from '@/lib/demo-config';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RefreshCw, ExternalLink, AlertCircle, ArrowLeft } from 'lucide-react';

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
  metadata: Record<string, unknown> | null;
}

interface DraftDetailProps {
  draftId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT:            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED:         'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SCHEDULED:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PUBLISHED:        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  FAILED:           'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REJECTED:         'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS['DRAFT']}`}>
      {status}
    </span>
  );
}

export function DraftDetail({ draftId }: DraftDetailProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchDraft() {
    try {
      const data = await apiClient.get<ContentDraft>(
        `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}`,
      );
      setDraft(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load draft');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchDraft(); }, [draftId]);

  /** Schedule APPROVED draft to Postiz now (bypasses the 2-min cron). */
  async function handleScheduleNow() {
    if (!draft) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiClient.post<ContentDraft>(
        `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}/schedule`,
        {},
      );
      setDraft(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setBusy(false);
    }
  }

  /** Re-approve a FAILED draft so the scheduler picks it up again. */
  async function handleRetry() {
    if (!draft) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiClient.put<ContentDraft>(
        `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}`,
        { status: 'APPROVED' },
      );
      setDraft(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setBusy(false);
    }
  }

  /** Mark any draft as FAILED manually. */
  async function handleMarkFailed() {
    if (!draft) return;
    if (!confirm('Mark this draft as FAILED?')) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiClient.put<ContentDraft>(
        `/workspaces/${WORKSPACE_ID}/content-drafts/${draftId}`,
        { status: 'FAILED' },
      );
      setDraft(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Loading…</div>;
  }

  if (!draft) {
    return <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Draft not found.</div>;
  }

  const meta = draft.metadata as Record<string, unknown> | null;
  const scheduleError = meta?.scheduleError as string | undefined;
  const qaError = meta?.qaError as string | undefined;
  const qaResults = meta?.qaResults as Record<string, unknown> | undefined;
  const pageProfileId = meta?.pageProfileId as string | undefined;
  const generationModel = meta?.generationModel as string | undefined;
  const qaScore = meta?.qaScore as number | undefined;
  const qaAttempts = meta?.qaAttempts as number | undefined;
  const postizPostId = meta?.postizPostId as string | undefined;

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {actionError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <StatusBadge status={draft.status} />
            {pageProfileId && (
              <p className="text-xs text-muted-foreground">Auto-generated by page profile automation</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {/* APPROVED → schedule immediately (don't wait for cron) */}
            {draft.status === 'APPROVED' && (
              <button
                onClick={handleScheduleNow}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Scheduling…</> : 'Schedule Now'}
              </button>
            )}

            {/* FAILED → re-approve so cron picks it up again */}
            {draft.status === 'FAILED' && (
              <button
                onClick={handleRetry}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? <><RefreshCw className="h-4 w-4 animate-spin" /> Retrying…</> : 'Retry (Re-approve)'}
              </button>
            )}

            {/* DRAFT → quick schedule (bypasses approval) */}
            {draft.status === 'DRAFT' && (
              <button
                onClick={handleScheduleNow}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Quick Schedule
              </button>
            )}

            {/* SCHEDULED → view in Postiz */}
            {(draft.status === 'SCHEDULED' || draft.status === 'PUBLISHED') && (
              <Link
                href="http://localhost:4200"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4" /> View in Postiz
              </Link>
            )}

            {/* Manual mark as FAILED (for stuck APPROVED) */}
            {(draft.status === 'APPROVED' || draft.status === 'PENDING_APPROVAL') && (
              <button
                onClick={handleMarkFailed}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Mark Failed
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Content</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/40 rounded-md p-3">{draft.body}</p>
        </div>

        {/* Error details */}
        {(scheduleError || qaError) && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/10 p-3 text-sm">
            <p className="font-medium text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> Error Details
            </p>
            {scheduleError && <p className="text-red-600 dark:text-red-300 text-xs">{scheduleError}</p>}
            {qaError && <p className="text-red-600 dark:text-red-300 text-xs">{qaError}</p>}
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaRow label="Created">{new Date(draft.createdAt).toLocaleString()}</MetaRow>
          <MetaRow label="Updated">{new Date(draft.updatedAt).toLocaleString()}</MetaRow>
          {draft.scheduledAt && (
            <MetaRow label="Scheduled for">
              <span className="text-blue-600 dark:text-blue-400">{new Date(draft.scheduledAt).toLocaleString()}</span>
            </MetaRow>
          )}
          {draft.publishedAt && (
            <MetaRow label="Published at">{new Date(draft.publishedAt).toLocaleString()}</MetaRow>
          )}
          {generationModel && <MetaRow label="AI Model">{generationModel}</MetaRow>}
          {typeof qaScore === 'number' && <MetaRow label="QA Score">{Math.round(qaScore)} / 100</MetaRow>}
          {typeof qaAttempts === 'number' && <MetaRow label="QA Attempts">{qaAttempts}</MetaRow>}
          {postizPostId && <MetaRow label="Postiz Post ID">{postizPostId}</MetaRow>}
        </div>

        {/* QA breakdown */}
        {qaResults && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">QA Results</h3>
            <pre className="bg-muted/40 rounded-md p-3 text-xs overflow-auto max-h-40">
              {JSON.stringify(qaResults, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/content-drafts')}
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Drafts
      </button>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}: </span>
      <span className="font-medium text-sm">{children}</span>
    </div>
  );
}
