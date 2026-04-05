'use client';
import { WORKSPACE_ID } from '@/lib/demo-config';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { RefreshCw, Play, PauseCircle, Plus, Zap } from 'lucide-react';

// ─── Hardcoded for demo (matches existing pattern in this repo) ───────────────



interface PageProfile {
  id: string;
  name: string;
  niche: string;
  description: string | null;
  status: string;
  lastPostAt: string | null;
  contentStrategy: { type: string; style?: string; topics?: string[] };
  schedule: { times: string[]; timezone: string };
  aiConfig: { qaEnabled: boolean; maxRetries: number };
  stats: { totalPosts: number; failedGenerations: number };
}

interface GenerateResult {
  draftId: string;
  status: string;
  pageProfileId: string;
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateProfileForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    niche: '',
    description: '',
    style: 'professional' as 'professional' | 'funny' | 'educational' | 'viral',
    topics: '',
    times: '09:00,18:00',
    timezone: 'Asia/Ho_Chi_Minh',
    qaEnabled: true,
    strategy: 'ai-generated',
    sourceConnectionId: '',
    appendText: '',
  });

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const topics = form.topics.split(',').map((t) => t.trim()).filter(Boolean);
      const times = form.times.split(',').map((t) => t.trim()).filter(Boolean);

      const contentStrategy =
        form.strategy === 'repost'
          ? { type: 'repost', style: 'professional' as const, sourceConnectionId: form.sourceConnectionId, appendText: form.appendText }
          : { type: 'ai-generated', style: form.style, topics };

      await apiClient.post(
        `/workspaces/${WORKSPACE_ID}/page-profiles`,
        {
          name: form.name,
          niche: form.niche,
          description: form.description || undefined,
          contentStrategy,
          socialConnectionIds: [],
          schedule: { frequency: times.length, times, timezone: form.timezone },
          aiConfig: { generationModel: 'claude-haiku-4-5-20251001', qaEnabled: form.qaEnabled, minQualityScore: 70, maxRetries: 2 },
        },
      );
      setOpen(false);
      setForm({ name: '', niche: '', description: '', style: 'professional', topics: '', times: '09:00,18:00', timezone: 'Asia/Ho_Chi_Minh', qaEnabled: true, strategy: 'ai-generated', sourceConnectionId: '', appendText: '' });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Profile
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Create Page Profile</h2>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Page Name *">
            <input className={input} placeholder="e.g. Tech Tips Daily" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </Field>

          <Field label="Niche *">
            <input className={input} placeholder="e.g. tech, food, fitness, motivation" value={form.niche} onChange={(e) => set('niche', e.target.value)} required />
          </Field>

          <Field label="Description">
            <input className={input} placeholder="Short page description (optional)" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <Field label="Strategy">
            <select className={input} value={form.strategy} onChange={(e) => set('strategy', e.target.value)}>
              <option value="ai-generated">AI Generated</option>
              <option value="repost">Repost from another page</option>
            </select>
          </Field>

          {form.strategy === 'ai-generated' && (
            <>
              <Field label="Brand Voice / Style">
                <select className={input} value={form.style} onChange={(e) => set('style', e.target.value)}>
                  <option value="professional">Professional</option>
                  <option value="funny">Funny</option>
                  <option value="educational">Educational</option>
                  <option value="viral">Viral</option>
                </select>
              </Field>
              <Field label="Topics (comma-separated)">
                <input className={input} placeholder="AI tools, productivity, coding tips" value={form.topics} onChange={(e) => set('topics', e.target.value)} />
              </Field>
            </>
          )}

          {form.strategy === 'repost' && (
            <>
              <Field label="Source Connection ID">
                <input className={input} placeholder="SocialConnection ID of the source page" value={form.sourceConnectionId} onChange={(e) => set('sourceConnectionId', e.target.value)} />
              </Field>
              <Field label="Append Text (optional)">
                <input className={input} placeholder="#repost" value={form.appendText} onChange={(e) => set('appendText', e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Posting Times (comma-separated)">
            <input className={input} placeholder="09:00,18:00" value={form.times} onChange={(e) => set('times', e.target.value)} />
          </Field>

          <Field label="Timezone">
            <input className={input} placeholder="Asia/Ho_Chi_Minh" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="qaEnabled" checked={form.qaEnabled} onChange={(e) => set('qaEnabled', e.target.checked)} className="h-4 w-4" />
            <label htmlFor="qaEnabled" className="text-sm">Enable AI quality check before publishing</label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Profile'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────

function ProfileCard({ profile, onRefresh }: { profile: PageProfile; onRefresh: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState('');
  const [toggling, setToggling] = useState(false);

  async function triggerGeneration() {
    setGenerating(true);
    setResult(null);
    setGenError('');
    try {
      const res = await apiClient.post<GenerateResult>(
        `/workspaces/${WORKSPACE_ID}/automations/page-profiles/${profile.id}/generate`,
        {},
      );
      setResult(res);
      onRefresh();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function toggleStatus() {
    setToggling(true);
    try {
      const newStatus = profile.status === 'ACTIVE' ? 'paused' : 'active';
      await apiClient.patch(
        `/workspaces/${WORKSPACE_ID}/page-profiles/${profile.id}`,
        { status: newStatus },
      );
      onRefresh();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  const strategy = profile.contentStrategy;
  const isActive = profile.status === 'ACTIVE';

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{profile.name}</h3>
            <StatusBadge status={profile.status} />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{strategy.type}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Niche: <span className="font-medium">{profile.niche}</span>
            {strategy.type === 'ai-generated' && strategy.style && (
              <> · Style: <span className="font-medium">{strategy.style}</span></>
            )}
          </p>
          {strategy.type === 'ai-generated' && strategy.topics && strategy.topics.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Topics: {strategy.topics.join(', ')}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Schedule: {profile.schedule.times?.join(', ') || '—'} ({profile.schedule.timezone})
            {profile.lastPostAt && (
              <> · Last post: {new Date(profile.lastPostAt).toLocaleString()}</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Posts: {profile.stats?.totalPosts ?? 0} · Failed: {profile.stats?.failedGenerations ?? 0}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={toggleStatus}
            disabled={toggling}
            title={isActive ? 'Pause automation' : 'Activate automation'}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            {isActive ? <PauseCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={triggerGeneration}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            ) : (
              <><Zap className="h-3.5 w-3.5" /> Generate Now</>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className={`rounded-md p-3 text-sm ${result.status === 'APPROVED' || result.status === 'SCHEDULED' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : result.status === 'SKIPPED' || result.status === 'ALREADY_REPOSTED' ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {result.status === 'APPROVED' && '✅ Content generated and approved — will be scheduled within 2 minutes.'}
          {result.status === 'FAILED' && '❌ Content generation failed QA after max retries. Check Content Drafts for details.'}
          {result.status === 'SKIPPED' && '⏭️ No new source content to repost yet.'}
          {result.status === 'ALREADY_REPOSTED' && '⏭️ Already reposted the latest content from source.'}
          {result.draftId && (
            <span className="block mt-1 text-xs opacity-70">Draft ID: {result.draftId}</span>
          )}
        </div>
      )}

      {genError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          ❌ {genError}
        </div>
      )}
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function PageProfilesList() {
  const [profiles, setProfiles] = useState<PageProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ data: PageProfile[]; total: number }>(
        `/workspaces/${WORKSPACE_ID}/page-profiles`,
      );
      setProfiles(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  // Load on mount
  useEffect(() => { void load(); }, []);

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">Loading…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-destructive text-sm">
          Error: {error}
        </div>
        <CreateProfileForm onCreated={load} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <CreateProfileForm onCreated={load} />
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center space-y-2">
          <p className="text-muted-foreground">No page profiles yet.</p>
          <p className="text-sm text-muted-foreground">Create your first profile to start automating content.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    ARCHIVED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map['ARCHIVED']}`}>
      {status}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const input = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
