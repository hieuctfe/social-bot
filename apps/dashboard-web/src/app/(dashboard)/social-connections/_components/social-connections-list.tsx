'use client';
import { WORKSPACE_ID } from '@/lib/demo-config';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { RefreshCw, ExternalLink, Trash2 } from 'lucide-react';

interface SocialConnection {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  postizIntegrationId: string;
  avatarUrl: string | null;
  lastSyncAt: string | null;
  createdAt: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  FACEBOOK:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  INSTAGRAM: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  TWITTER:   'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  TIKTOK:    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  LINKEDIN:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  YOUTUBE:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SocialConnectionsList() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number } | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<SocialConnection[]>(
        `/workspaces/${WORKSPACE_ID}/social-connections`,
      );
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }

  async function syncFromPostiz() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await apiClient.post<{ created: number; updated: number; total: number; connections: SocialConnection[] }>(
        `/workspaces/${WORKSPACE_ID}/social-connections/sync-from-postiz`,
        {},
      );
      setConnections(result.connections);
      setSyncResult({ created: result.created, updated: result.updated });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove "${name}" from this workspace?`)) return;
    try {
      await apiClient.delete(`/workspaces/${WORKSPACE_ID}/social-connections/${id}`);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {connections.length} connected account{connections.length !== 1 ? 's' : ''}
          </p>
          {syncResult && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Sync complete — {syncResult.created} new, {syncResult.updated} updated
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={syncFromPostiz}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Postiz'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Empty state */}
      {!loading && connections.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center space-y-3">
          <p className="text-muted-foreground">No social accounts imported yet.</p>
          <p className="text-sm text-muted-foreground">
            1. Connect your accounts in{' '}
            <a href="http://localhost:4200" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
              Postiz <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            2. Click <strong>Sync from Postiz</strong> above to import them here.
          </p>
        </div>
      )}

      {/* Connection cards */}
      {connections.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <div key={conn.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {conn.avatarUrl ? (
                    <img
                      src={conn.avatarUrl}
                      alt={conn.displayName}
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {conn.displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{conn.displayName}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PROVIDER_COLORS[conn.provider] ?? 'bg-muted text-muted-foreground'}`}>
                      {conn.provider}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    conn.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {conn.status}
                  </span>
                  <button
                    onClick={() => remove(conn.id, conn.displayName)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {conn.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last synced {new Date(conn.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
