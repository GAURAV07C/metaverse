export function validatePortalTargets(data: any, width: number, height: number) {
  const areas = Array.isArray(data?.areas) ? data.areas : [];
  const roomIds = new Set(
    areas
      .filter((area: any) => area?.id && (area.type === "room" || area.type === "private"))
      .map((area: any) => area.id)
  );

  for (const area of areas) {
    if (area?.type !== "portal") continue;

    const label = area.name || "Portal";
    const hasX = area.targetX !== undefined && area.targetX !== null && area.targetX !== "";
    const hasY = area.targetY !== undefined && area.targetY !== null && area.targetY !== "";

    if (hasX !== hasY) return `${label}: target X and Y both are required`;

    if (hasX && hasY) {
      if (!Number.isInteger(area.targetX) || !Number.isInteger(area.targetY)) {
        return `${label}: target coordinates must be integers`;
      }
      if (!area.targetSpaceId && (area.targetX < 0 || area.targetX >= width || area.targetY < 0 || area.targetY >= height)) {
        return `${label}: target coordinates must stay inside the map`;
      }
    }

    if (typeof area.targetUrl === "string" && area.targetUrl.trim()) {
      const url = area.targetUrl.trim();
      if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) {
        return `${label}: target URL must start with / or http(s)`;
      }
    }

    if (area.targetRoomId && !area.targetSpaceId && !roomIds.has(area.targetRoomId)) {
      return `${label}: target room does not exist in this map`;
    }
  }

  return "";
}
