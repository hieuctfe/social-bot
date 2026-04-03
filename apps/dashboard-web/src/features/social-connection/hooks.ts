import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SocialConnection } from '@social-bot/domain';

export function useSocialConnections(workspaceId: string) {
  return useQuery<SocialConnection[]>({
    queryKey: ['social-connections', workspaceId],
    queryFn: () => apiClient.get(`/workspaces/${workspaceId}/social-connections`),
    enabled: !!workspaceId,
  });
}
