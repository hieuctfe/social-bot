'use client';
import { WORKSPACE_ID } from '@/lib/demo-config';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';




interface FormData {
  title: string;
  body: string;
  platformTargets: string[];
}

export function NewDraftForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    body: '',
    platformTargets: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platforms = [
    { id: 'FACEBOOK', label: 'Facebook' },
    { id: 'INSTAGRAM', label: 'Instagram' },
    { id: 'TIKTOK', label: 'TikTok' },
    { id: 'LINKEDIN', label: 'LinkedIn' },
    { id: 'TWITTER', label: 'Twitter/X' },
  ];

  const handlePlatformToggle = (platformId: string) => {
    setFormData((prev) => ({
      ...prev,
      platformTargets: prev.platformTargets.includes(platformId)
        ? prev.platformTargets.filter((p) => p !== platformId)
        : [...prev.platformTargets, platformId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.body.trim()) {
      setError('Content is required');
      return;
    }
    if (formData.platformTargets.length === 0) {
      setError('Select at least one platform');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const draft = await apiClient.post(
        `/workspaces/${WORKSPACE_ID}/content-drafts`,
        formData,
      );

      router.push(`/content-drafts/${(draft as {id: string}).id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setFormData({ ...formData, title: value });
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Enter a title for your post"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="body" className="text-sm font-medium">
            Content
          </label>
          <textarea
            id="body"
            value={formData.body}
            onChange={(e) => {
              const value = (e.target as HTMLTextAreaElement).value;
              setFormData({ ...formData, body: value });
            }}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Write your post content here..."
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            {formData.body.length} characters
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Target Platforms</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {platforms.map((platform) => (
              <label
                key={platform.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  formData.platformTargets.includes(platform.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-input hover:bg-accent'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.platformTargets.includes(platform.id)}
                  onChange={() => handlePlatformToggle(platform.id)}
                  className="rounded border-input"
                  disabled={loading}
                />
                <span className="text-sm">{platform.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Draft'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
