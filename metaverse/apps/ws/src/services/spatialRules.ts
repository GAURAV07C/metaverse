export type SpatialPeer = {
  id: string;
  userId?: string;
  x: number;
  y: number;
};

const PROXIMITY_THRESHOLD = 5;

export function isAudioRoom(zone: any) {
  return zone?.type === "room" || zone?.type === "private";
}

export function isInsideZone(x: number, y: number, zone: any) {
  return x >= zone.startX && x < zone.endX && y >= zone.startY && y < zone.endY;
}

export function getAudioRoomAt(zones: any[], x: number, y: number) {
  return zones.find((zone: any) => isAudioRoom(zone) && isInsideZone(x, y, zone));
}

export function getSeatAt(zones: any[], x: number, y: number) {
  return zones.find((zone: any) => zone.type === "seat" && isInsideZone(x, y, zone));
}

export function getSeatsInRoom(zones: any[], room: any) {
  return zones.filter((zone: any) =>
    zone.type === "seat" &&
    zone.startX >= room.startX &&
    zone.endX <= room.endX &&
    zone.startY >= room.startY &&
    zone.endY <= room.endY
  );
}

export function arePeersInAudioRange(zones: any[], user: SpatialPeer, otherUser: SpatialPeer) {
  const getZone = (peer: SpatialPeer, typeFilter?: string) => {
    return zones.find(zone =>
      (typeFilter ? zone.type === typeFilter : isAudioRoom(zone)) &&
      isInsideZone(peer.x, peer.y, zone)
    );
  };

  const userZone = getZone(user);
  const otherUserZone = getZone(otherUser);
  const userSpotlightZone = getZone(user, "spotlight");
  const otherUserSpotlightZone = getZone(otherUser, "spotlight");

  if (userZone || otherUserZone) {
    return Boolean(userZone && otherUserZone && userZone.id === otherUserZone.id);
  }

  if ((userSpotlightZone || otherUserSpotlightZone) && (userZone?.id === otherUserZone?.id)) {
    return true;
  }

  const distance = Math.sqrt(
    Math.pow(user.x - otherUser.x, 2) + Math.pow(user.y - otherUser.y, 2)
  );
  return distance <= PROXIMITY_THRESHOLD;
}
