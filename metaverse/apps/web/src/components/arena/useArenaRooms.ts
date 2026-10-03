import { useMemo } from 'react';
import type { SpaceElement } from './ElementsPanel';
import type { OtherUser, RoomSession } from './types';

type Position = { x: number; y: number };
type Dimensions = { w: number; h: number };

export function isAudioRoomZone(zone: any) {
  return zone?.type === 'room' || zone?.type === 'private';
}

export function isTileInZone(x: number, y: number, zone: any) {
  return x >= zone.startX && x < zone.endX && y >= zone.startY && y < zone.endY;
}

export function getRoomSpots(privateZones: any[], room: any) {
  return privateZones.filter(zone =>
    zone.type === 'seat' &&
    zone.startX >= room.startX &&
    zone.endX <= room.endX &&
    zone.startY >= room.startY &&
    zone.endY <= room.endY
  );
}

function isWalkableTile(
  x: number,
  y: number,
  dimensions: Dimensions,
  elements: SpaceElement[],
  hiddenElementIds: string[],
) {
  if (x < 0 || y < 0 || x >= dimensions.w || y >= dimensions.h) return false;

  return !elements.some((el) => {
    if (hiddenElementIds.includes(el.id)) return false;
    const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
    const isWalkableSurface = [
      'room',
      'floor',
      'rug',
      'carpet',
      'tile',
      'wood',
      'grass',
      'ground',
      'path',
      'walkable',
      'area',
    ].some(keyword => text.includes(keyword));
    const isSeat = ['seating', 'chair', 'sofa', 'couch', 'bench', 'stool', 'seat']
      .some(keyword => text.includes(keyword));

    if (!el.element.static || el.element.category === 'Rooms' || isWalkableSurface || isSeat) return false;
    return x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height;
  });
}

interface UseArenaRoomsInput {
  privateZones: any[];
  elements: SpaceElement[];
  hiddenElementIds?: string[];
  otherUsers: OtherUser[];
  myPos: Position;
  dimensions: Dimensions;
  selectedUser?: OtherUser | null;
  proximityUsers: string[];
  roomSessions: RoomSession[];
}

export function useArenaRooms({
  privateZones,
  elements,
  hiddenElementIds = [],
  otherUsers,
  myPos,
  dimensions,
  selectedUser,
  proximityUsers,
  roomSessions,
}: UseArenaRoomsInput) {
  return useMemo(() => {
    const currentRoom = privateZones.find(zone => isAudioRoomZone(zone) && isTileInZone(myPos.x, myPos.y, zone));
    const roomSpots = currentRoom ? getRoomSpots(privateZones, currentRoom) : [];

    const isZoneOccupied = (zone: any) =>
      isTileInZone(myPos.x, myPos.y, zone) ||
      otherUsers.some(user => isTileInZone(user.x, user.y, zone));

    const findWalkableTileInZone = (zone: any) => {
      for (let y = zone.startY; y < zone.endY; y += 1) {
        for (let x = zone.startX; x < zone.endX; x += 1) {
          const occupied = otherUsers.some(user => user.x === x && user.y === y) || (myPos.x === x && myPos.y === y);
          if (isWalkableTile(x, y, dimensions, elements, hiddenElementIds) && !occupied) return { x, y };
        }
      }
      return null;
    };

    const sessionForRoom = (roomId: string) => roomSessions.find(session => session.roomId === roomId);
    const sessionCount = (room: any) => {
      const session = sessionForRoom(room.id);
      if (session) return session.members.filter(member => Boolean(member.userId)).length;
      return otherUsers.filter(user => isTileInZone(user.x, user.y, room)).length +
        (isTileInZone(myPos.x, myPos.y, room) ? 1 : 0);
    };

    const activeRooms = privateZones
      .filter(isAudioRoomZone)
      .map((room) => {
        return { room, count: sessionCount(room) };
      })
      .filter(item => item.count > 0);

    const allRooms = privateZones
      .filter(isAudioRoomZone)
      .map((room) => {
        const spots = getRoomSpots(privateZones, room);
        const count = sessionCount(room);

        return {
          room,
          count,
          spots: spots.length,
          vacant: spots.filter(spot => !isZoneOccupied(spot)).length,
        };
      });

    const selectedUserRoom = selectedUser
      ? privateZones.find(zone => isAudioRoomZone(zone) && isTileInZone(selectedUser.x, selectedUser.y, zone))
      : null;

    const mediaGroupUserIds = Array.from(new Set([
      ...proximityUsers,
      ...(currentRoom
        ? (sessionForRoom(currentRoom.id)?.members.map(member => member.userId).filter(Boolean) as string[] | undefined) ||
          otherUsers.filter(user => isTileInZone(user.x, user.y, currentRoom)).map(user => user.userId)
        : []),
    ]));

    const currentPortal = privateZones.find(zone =>
      zone.type === 'portal' &&
      myPos.x >= zone.startX - 1 &&
      myPos.x <= zone.endX &&
      myPos.y >= zone.startY - 1 &&
      myPos.y <= zone.endY
    );

    const currentSpotlight = privateZones.find(zone =>
      zone.type === 'spotlight' &&
      isTileInZone(myPos.x, myPos.y, zone)
    );

    const currentMapZone = currentRoom || currentPortal || currentSpotlight || privateZones.find(zone =>
      zone.type === 'public' &&
      isTileInZone(myPos.x, myPos.y, zone)
    );

    return {
      currentRoom,
      roomSpots,
      activeRooms,
      allRooms,
      selectedUserRoom,
      mediaGroupUserIds,
      currentPortal,
      currentSpotlight,
      currentMapZone,
      getRoomSpots: (room: any) => getRoomSpots(privateZones, room),
      isTileInZone,
      isZoneOccupied,
      isSpotOccupied: isZoneOccupied,
      findWalkableTileInZone,
    };
  }, [dimensions, elements, hiddenElementIds, myPos, otherUsers, privateZones, proximityUsers, roomSessions, selectedUser]);
}
