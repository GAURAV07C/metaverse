import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { WsClient } from '../../utils/ws';
import { useSpaceQuery } from './queries';
import type { SpaceElement } from './ElementsPanel';
import type { PresenceStatus } from './types';

interface UseArenaSpaceStateInput {
  spaceId?: string;
  myUserId?: string | null;
  wsRef: React.MutableRefObject<WsClient | null>;
}

export function useArenaSpaceState({ spaceId, myUserId, wsRef }: UseArenaSpaceStateInput) {
  const [elements, setElements] = useState<SpaceElement[]>([]);
  const [privateZones, setPrivateZones] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ w: 48, h: 27 });
  const [spaceName, setSpaceName] = useState('Office');
  const [canEditSpace, setCanEditSpace] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('Guest');
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('available');
  const spaceQuery = useSpaceQuery(spaceId);

  const applySpaceData = useCallback((spaceData: any) => {
    if (!spaceData) return;
    const dimStr: string = spaceData.dimensions ?? '48x27';
    const [w, h] = dimStr.split('x').map(Number);
    const isOwner = Boolean(myUserId && spaceData.ownerId === myUserId);

    setDimensions({ w: w || 48, h: h || 27 });
    setSpaceName(spaceData.name || 'Office');
    setCanEditSpace(Boolean(spaceData.canEdit ?? isOwner));
    setCurrentUserRole(spaceData.currentUserRole || (isOwner ? 'Owner' : 'Guest'));
    setElements(spaceData.elements ?? []);
    setPrivateZones(spaceData.privateZones ?? []);
  }, [myUserId]);

  useEffect(() => {
    applySpaceData(spaceQuery.data);
  }, [applySpaceData, spaceQuery.data]);

  const fetchSpace = useCallback(async () => {
    const result = await spaceQuery.refetch();
    applySpaceData(result.data);
  }, [applySpaceData, spaceQuery]);

  const handleStatusChange = useCallback((status: PresenceStatus) => {
    setPresenceStatus(status);
    wsRef.current?.setStatus(status);
  }, [wsRef]);

  return {
    elements,
    privateZones,
    dimensions,
    setDimensions,
    spaceName,
    canEditSpace,
    currentUserRole,
    presenceStatus,
    fetchSpace,
    handleStatusChange,
  };
}
