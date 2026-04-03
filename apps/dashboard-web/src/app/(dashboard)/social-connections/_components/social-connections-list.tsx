'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbW5pZ2gzOXgwMDA0MTFmcmFwYnBpeWhrIiwiZW1haWwiOiJhZG1pbkBzb2NpYWxib3QubG9jYWwiLCJvcmdhbml6YXRpb25JZCI6ImNtbmlnaDM5dDAwMDAxMWZyODllYWV6OHgiLCJpYXQiOjE3NzUxOTgzMTAsImV4cCI6MTc3NTgwMzExMH0.cG-MsIY4TWysGPzP0CVIsawhfrT7idm0I3HK_Lq9GIw';
const WORKSPACE_ID = 'cmnigh39v000211fr0uvwigx5';

interface SocialConnection {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  postizIntegrationId: string;
  createdAt: string;
}

export function SocialConnectionsList() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const data = await apiClient.get<SocialConnection[]>(
          `/workspaces/${WORKSPACE_ID}/social-connections`,
          DEMO_TOKEN
        );
        setConnections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        Loading connections...
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

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        No social connections yet. Connect accounts through Postiz to get started.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {connections.map((connection) => (
        <div
          key={connection.id}
          className="rounded-lg border border-border bg-card p-6 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{connection.displayName}</h3>
              <p className="text-xs text-muted-foreground">{connection.provider}</p>
            </div>
            <StatusBadge status={connection.status} />
          </div>
          <div className="text-xs text-muted-foreground">
            Connected {new Date(connection.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
    ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status as keyof typeof colors] || colors.ACTIVE}`}>
      {status}
    </span>
  );
}
