import { useMemo } from 'react';
import type { SpaceElement } from './ElementsPanel';
import type { OtherUser } from './types';

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
) {
  if (x < 0 || y < 0 || x >= dimensions.w || y >= dimensions.h) return false;

  return !elements.some((el) => {
    const text = `${el.element.id} ${el.element.name ?? ''} ${el.element.category ?? ''}`.toLowerCase();
    const isFloor = el.element.category === 'Rooms' || text.includes('floor');
    const isSeat = text.includes('seating') ||
      text.includes('chair') ||
      text.includes('sofa') ||
      text.includes('couch') ||
      text.includes('bench') ||
      text.includes('stool') ||
      text.includes('seat');

    if (!el.element.static || isFloor || isSeat) return false;
    return x >= el.x && x < el.x + el.element.width && y >= el.y && y < el.y + el.element.height;
  });
}

interface UseArenaRoomsInput {
  privateZones: any[];
  elements: SpaceElement[];
  otherUsers: OtherUser[];
  myPos: Position;
  dimensions: Dimensions;
  selectedUser?: OtherUser | null;
  proximityUsers: string[];
}

export function useArenaRooms({
  privateZones,
  elements,
  otherUsers,
  myPos,
  dimensions,
  selectedUser,
  proximityUsers,
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
          if (isWalkableTile(x, y, dimensions, elements) && !occupied) return { x, y };
        }
      }
      return null;
    };

    const activeRooms = privateZones
      .filter(isAudioRoomZone)
      .map((room) => {
        const otherCount = otherUsers.filter(user => isTileInZone(user.x, user.y, room)).length;
        const iAmInside = isTileInZone(myPos.x, myPos.y, room);
        return { room, count: otherCount + (iAmInside ? 1 : 0) };
      })
      .filter(item => item.count > 0);

    const allRooms = privateZones
      .filter(isAudioRoomZone)
      .map((room) => {
        const spots = getRoomSpots(privateZones, room);
        const count = otherUsers.filter(user => isTileInZone(user.x, user.y, room)).length +
          (isTileInZone(myPos.x, myPos.y, room) ? 1 : 0);

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
      ...(currentRoom ? otherUsers.filter(user => isTileInZone(user.x, user.y, currentRoom)).map(user => user.userId) : []),
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
  }, [dimensions, elements, myPos, otherUsers, privateZones, proximityUsers, selectedUser]);
}
