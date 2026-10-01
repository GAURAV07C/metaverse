import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import type { RoomPrefab } from './ElementsPanel';

export const arenaQueryKeys = {
  space: (spaceId?: string) => ['arena', 'space', spaceId] as const,
  availableAssets: ['arena', 'available-assets'] as const,
  notificationPreferences: (spaceId?: string) => ['arena', 'notification-preferences', spaceId] as const,
  inviteEvents: (spaceId?: string) => ['arena', 'invite-events', spaceId] as const,
  moderationAudit: (spaceId?: string) => ['arena', 'moderation-audit', spaceId] as const,
};

export function useSpaceQuery(spaceId?: string) {
  return useQuery({
    queryKey: arenaQueryKeys.space(spaceId),
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const res = await api.get(`/space/${spaceId}`);
      return res.data;
    },
  });
}

export function useAvailableAssetsQuery() {
  return useQuery({
    queryKey: arenaQueryKeys.availableAssets,
    enabled: false,
    queryFn: async () => {
      const [elemRes, mapRes] = await Promise.all([
        api.get('/elements').catch(() => ({ data: { element: [] } })),
        api.get('/maps').catch(() => ({ data: { maps: [] } })),
      ]);

      const roomPrefabs: RoomPrefab[] = (mapRes.data.maps || [])
        .filter((m: any) => m.type === 'room')
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          category: 'Admin Room',
          description: `${m.elementCount} items`,
          items: m.elements.map((e: any) => ({
            elementId: e.element.id,
            offsetX: e.x,
            offsetY: e.y,
          })),
        }));

      return {
        elements: elemRes.data.element ?? [],
        roomPrefabs,
      };
    },
  });
}

export function useNotificationPreferencesQuery(spaceId?: string) {
  return useQuery({
    queryKey: arenaQueryKeys.notificationPreferences(spaceId),
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const res = await api.get(`/office/${spaceId}/notification-preferences`);
      return res.data.preferences;
    },
  });
}

export function useInviteEventsQuery(spaceId?: string) {
  return useQuery({
    queryKey: arenaQueryKeys.inviteEvents(spaceId),
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const res = await api.get(`/office/${spaceId}/invite-events?take=30`);
      return Array.isArray(res.data?.events) ? res.data.events : [];
    },
  });
}

export function useModerationAuditQuery(spaceId?: string, enabled = true) {
  return useQuery({
    queryKey: arenaQueryKeys.moderationAudit(spaceId),
    enabled: Boolean(spaceId) && enabled,
    retry: false,
    queryFn: async () => {
      const res = await api.get(`/office/${spaceId}/moderation-audit?take=40`);
      return Array.isArray(res.data?.events) ? res.data.events : [];
    },
  });
}
