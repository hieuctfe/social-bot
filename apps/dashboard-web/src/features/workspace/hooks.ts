import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Workspace } from '@social-bot/domain';

export function useWorkspaces(orgId: string) {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', orgId],
    queryFn: () => apiClient.get(`/organizations/${orgId}/workspaces`),
    enabled: !!orgId,
  });
}

export function useCreateWorkspace(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      apiClient.post(`/organizations/${orgId}/workspaces`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces', orgId] });
    },
  });
}
