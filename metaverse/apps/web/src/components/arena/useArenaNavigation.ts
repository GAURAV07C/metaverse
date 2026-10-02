import { useEffect, useRef } from 'react';
import type React from 'react';
import { isAudioRoomZone } from './useArenaRooms';
import type { ChatScope } from './types';

type Tile = { x: number; y: number };

interface UseArenaNavigationInput {
  connected: boolean;
  privateZones: any[];
  otherUsers: any[];
  myPos: Tile;
  dimensions: { w: number; h: number };
  currentRoom: any;
  currentPortal: any;
  chatScope: ChatScope;
  setChatScope: React.Dispatch<React.SetStateAction<ChatScope>>;
  setViewMode: (mode: 'map' | 'grid') => void;
  getRoomSpots: (room: any) => any[];
  isTileInZone: (x: number, y: number, zone: any) => boolean;
  isSpotOccupied: (spot: any) => boolean;
  findWalkableTileInZone: (zone: any) => Tile | null;
  moveToTile: (x: number, y: number) => void;
  teleportToTile: (x: number, y: number) => void;
}

function buildPortalUrl(portal: any) {
  if (portal.targetUrl) return portal.targetUrl;
  if (!portal.targetSpaceId) return '';
  const url = new URL(`/space/${portal.targetSpaceId}`, window.location.origin);
  if (portal.targetRoomId) url.searchParams.set('room', portal.targetRoomId);
  if (Number.isInteger(portal.targetX) && Number.isInteger(portal.targetY)) {
    url.searchParams.set('x', String(portal.targetX));
    url.searchParams.set('y', String(portal.targetY));
  }
  return url.toString();
}

function getZoneCenter(zone: any) {
  return {
    x: Math.max(zone.startX, Math.min(zone.endX - 1, Math.floor((zone.startX + zone.endX) / 2))),
    y: Math.max(zone.startY, Math.min(zone.endY - 1, Math.floor((zone.startY + zone.endY) / 2))),
  };
}

export function useArenaNavigation({
  connected,
  privateZones,
  otherUsers,
  myPos,
  dimensions,
  currentRoom,
  currentPortal,
  chatScope,
  setChatScope,
  setViewMode,
  getRoomSpots,
  isTileInZone,
  isSpotOccupied,
  findWalkableTileInZone,
  moveToTile,
  teleportToTile,
}: UseArenaNavigationInput) {
  const autoJoinedRoomRef = useRef<string | null>(null);

  const usePortal = () => {
    if (!currentPortal) return;
    const targetUrl = buildPortalUrl(currentPortal);
    if (targetUrl) {
      window.location.href = targetUrl;
      return;
    }

    if (Number.isInteger(currentPortal.targetX) && Number.isInteger(currentPortal.targetY)) {
      const x = Math.max(0, Math.min(dimensions.w - 1, currentPortal.targetX));
      const y = Math.max(0, Math.min(dimensions.h - 1, currentPortal.targetY));
      const targetZone = privateZones.find(z =>
        z.id !== currentPortal.id &&
        (z.type === 'portal' || z.type === 'spawn' || isAudioRoomZone(z)) &&
        isTileInZone(x, y, z)
      );
      const availableTarget = targetZone ? findWalkableTileInZone(targetZone) : null;
      teleportToTile(availableTarget?.x ?? x, availableTarget?.y ?? y);
      return;
    }

    const portals = privateZones.filter(z => z.type === 'portal');
    const nextPortal = portals.length > 1
      ? portals[(Math.max(0, portals.findIndex(z => z.id === currentPortal.id)) + 1) % portals.length]
      : null;
    const target = nextPortal || privateZones.find(z => z.type === 'spawn');
    if (!target) return;

    const availableTarget = findWalkableTileInZone(target);
    const fallbackTarget = getZoneCenter(target);
    teleportToTile(availableTarget?.x ?? fallbackTarget.x, availableTarget?.y ?? fallbackTarget.y);
  };

  const chooseSpot = (spot: any) => {
    if (isSpotOccupied(spot)) return;
    const { x, y } = getZoneCenter(spot);
    moveToTile(x, y);
  };

  const leaveRoom = () => {
    if (!currentRoom) return;
    const x = Math.max(0, Math.min(dimensions.w - 1, myPos.x));
    const y = Math.max(0, Math.min(dimensions.h - 1, currentRoom.endY));
    moveToTile(x, y);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.toString());
  };

  const joinRoom = (roomId: string) => {
    const room = privateZones.find(z => z.id === roomId && isAudioRoomZone(z));
    if (!room) return;
    const spotTarget = getRoomSpots(room)
      .filter(spot => !isSpotOccupied(spot))
      .map(findWalkableTileInZone)
      .find(Boolean);
    const fallbackTarget = spotTarget || findWalkableTileInZone(room) || getZoneCenter(room);

    teleportToTile(fallbackTarget.x, fallbackTarget.y);
    setViewMode('map');
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    const onJoinRoomEvent = (event: Event) => {
      const roomId = (event as CustomEvent<{ roomId?: string }>).detail?.roomId;
      if (roomId) joinRoom(roomId);
    };
    window.addEventListener('arena-join-room', onJoinRoomEvent);
    return () => window.removeEventListener('arena-join-room', onJoinRoomEvent);
  }, [privateZones, otherUsers, myPos]);

  useEffect(() => {
    if (currentRoom && chatScope === 'everyone') {
      setChatScope('room');
    } else if (!currentRoom && chatScope === 'room') {
      setChatScope('everyone');
    }
  }, [currentRoom?.id, chatScope]);

  useEffect(() => {
    const onRoomJoinClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('.room-join-button');
      const roomId = button?.dataset.roomId;
      if (!roomId || button.disabled) return;
      event.preventDefault();
      joinRoom(roomId);
    };
    document.addEventListener('click', onRoomJoinClick, true);
    return () => document.removeEventListener('click', onRoomJoinClick, true);
  }, [privateZones, otherUsers, myPos]);

  useEffect(() => {
    if (!connected || privateZones.length === 0) return;
    const roomId = new URL(window.location.href).searchParams.get('room');
    if (!roomId || autoJoinedRoomRef.current === roomId) return;
    if (!privateZones.some(z => z.id === roomId && isAudioRoomZone(z))) return;
    autoJoinedRoomRef.current = roomId;
    joinRoom(roomId);
  }, [connected, privateZones.length]);

  return {
    usePortal,
    chooseSpot,
    leaveRoom,
    joinRoom,
  };
}
