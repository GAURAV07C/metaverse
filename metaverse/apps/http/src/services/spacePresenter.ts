import { canEditSpace, getSpaceRole } from "./officeAccess.js";

export function presentSpaceListItem(space: any, userId: string) {
  return {
    id: space.id,
    name: space.name,
    thumbnail: space.thumbnail,
    dimensions: `${space.width}x${space.height}`,
    currentUserRole: getSpaceRole(space, userId),
    canEdit: canEditSpace(space, userId),
  };
}

export function presentSpaceDetail(space: any, userId: string) {
  return {
    id: space.id,
    name: space.name,
    thumbnail: space.thumbnail,
    dimensions: `${space.width}x${space.height}`,
    ownerId: space.creatorId,
    currentUserRole: getSpaceRole(space, userId),
    canEdit: canEditSpace(space, userId),
    elements: space.elements.map(presentSpaceElement),
    privateZones: mergePrivateZonesWithDraft(space.privateZones, space.studioDraft?.data),
  };
}

function presentSpaceElement(placement: any) {
  const customData = readCustomData(placement.customData);

  return {
    id: placement.id,
    element: {
      id: placement.element.id,
      imageUrl: customData.imageUrl ?? placement.element.imageUrl,
      colorMaskUrl: customData.colorMaskUrl ?? placement.element.colorMaskUrl,
      width: customData.width ?? placement.element.width,
      height: customData.height ?? placement.element.height,
      static: placement.element.static,
      name: customData.name ?? placement.element.name,
      category: customData.category ?? placement.element.category,
      floor: customData.floor ?? null,
      wall: customData.wall ?? null,
      color: customData.color ?? null,
      interactiveObjects: customData.interactiveObjects ?? placement.element.interactiveObjects,
    },
    x: placement.x,
    y: placement.y,
  };
}

function mergePrivateZonesWithDraft(privateZones: any[], draftData: any) {
  const draftAreas: any[] = Array.isArray(draftData?.areas) ? draftData.areas : [];
  const draftAreaById = new Map<string, any>(draftAreas.filter((area: any) => area?.id).map((area: any) => [area.id, area]));
  const draftAreaByBounds = new Map<string, any>(draftAreas.map((area: any) => [
    `${area.type === "private" ? "room" : (area.type || "public")}:${area.x}:${area.y}:${area.x + area.w}:${area.y + area.h}`,
    area,
  ]));

  return privateZones.map((zone: any) => {
    const draftArea = draftAreaById.get(zone.id) ||
      draftAreaByBounds.get(`${zone.type}:${zone.startX}:${zone.startY}:${zone.endX}:${zone.endY}`);

    if (!draftArea) return zone;

    return {
      ...zone,
      targetUrl: zone.targetUrl || draftArea.targetUrl || null,
      targetSpaceId: zone.targetSpaceId || draftArea.targetSpaceId || null,
      targetRoomId: zone.targetRoomId || draftArea.targetRoomId || null,
      targetX: Number.isInteger(zone.targetX) ? zone.targetX : (Number.isInteger(draftArea.targetX) ? draftArea.targetX : null),
      targetY: Number.isInteger(zone.targetY) ? zone.targetY : (Number.isInteger(draftArea.targetY) ? draftArea.targetY : null),
      isDefaultSpawn: Boolean(zone.isDefaultSpawn || draftArea.isDefaultSpawn),
    };
  });
}

function readCustomData(customData: unknown): Record<string, any> {
  if (typeof customData !== "string") return customData && typeof customData === "object" ? customData as Record<string, any> : {};

  try {
    return JSON.parse(customData);
  } catch {
    return {};
  }
}
