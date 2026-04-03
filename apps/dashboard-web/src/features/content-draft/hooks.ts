import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ContentDraft } from '@social-bot/domain';

export function useContentDrafts(workspaceId: string) {
  return useQuery<ContentDraft[]>({
    queryKey: ['content-drafts', workspaceId],
    queryFn: () => apiClient.get(`/workspaces/${workspaceId}/content-drafts`),
    enabled: !!workspaceId,
  });
}

export function useCreateContentDraft(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; platformTargets?: string[] }) =>
      apiClient.post(`/workspaces/${workspaceId}/content-drafts`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-drafts', workspaceId] });
    },
  });
}
