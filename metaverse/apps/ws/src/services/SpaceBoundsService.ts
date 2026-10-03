import client from "@repo/db/client";

type SpaceBounds = {
  width: number;
  height: number;
  blocked: Set<string>;
};

export class SpaceBoundsService {
  private boundsBySpace = new Map<string, SpaceBounds>();

  clear(spaceId: string) {
    this.boundsBySpace.delete(spaceId);
  }

  async load(spaceId: string, forceReload = false) {
    if (!forceReload && this.boundsBySpace.has(spaceId)) {
      return this.boundsBySpace.get(spaceId);
    }

    const space = await client.space.findUnique({
      where: { id: spaceId },
      select: {
        width: true,
        height: true,
        elements: {
          select: {
            x: true,
            y: true,
            elementId: true,
            customData: true,
            element: {
              select: { id: true, name: true, category: true, width: true, height: true, static: true },
            },
          },
        },
      },
    });

    if (!space || !space.height) return undefined;

    const bounds = {
      width: space.width,
      height: space.height,
      blocked: this.collectBlockedTiles(space.elements),
    };

    this.boundsBySpace.set(spaceId, bounds);
    return bounds;
  }

  async canOccupy(spaceId: string, x: number, y: number) {
    const bounds = await this.load(spaceId);
    if (!bounds) return true;
    if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return false;
    return !bounds.blocked.has(`${x}:${y}`);
  }

  private collectBlockedTiles(elements: Array<{
    x: number;
    y: number;
    elementId: string;
    customData: unknown;
    element: {
      id: string;
      name: string;
      category: string | null;
      width: number;
      height: number;
      static: boolean;
    };
  }>) {
    const blocked = new Set<string>();

    for (const placement of elements) {
      if (!placement.element.static) continue;

      const customData = this.readCustomData(placement.customData);
      const category = String(customData.category || placement.element.category || "").toLowerCase();
      const name = String(customData.name || placement.element.name || "").toLowerCase();
      const elementId = String(placement.elementId || placement.element.id || "").toLowerCase();

      if (this.isWalkableSurface(category, name, elementId)) continue;
      if (this.isWalkableSeat(category, name, elementId)) continue;

      const width = customData.width ?? placement.element.width;
      const height = customData.height ?? placement.element.height;

      for (let x = placement.x; x < placement.x + width; x += 1) {
        for (let y = placement.y; y < placement.y + height; y += 1) {
          blocked.add(`${x}:${y}`);
        }
      }
    }

    return blocked;
  }

  private readCustomData(customData: unknown): Record<string, any> {
    if (typeof customData !== "string") return customData && typeof customData === "object" ? customData as Record<string, any> : {};

    try {
      return JSON.parse(customData);
    } catch {
      return {};
    }
  }

  private isWalkableSeat(category: string, name: string, elementId: string) {
    return category.includes("seating") ||
      name.includes("chair") ||
      name.includes("sofa") ||
      name.includes("couch") ||
      name.includes("bench") ||
      name.includes("stool") ||
      name.includes("seat") ||
      elementId.includes("chair");
  }

  private isWalkableSurface(category: string, name: string, elementId: string) {
    const text = `${category} ${name} ${elementId}`;
    return [
      "room",
      "floor",
      "rug",
      "carpet",
      "tile",
      "wood",
      "grass",
      "ground",
      "path",
      "walkable",
      "area",
    ].some((keyword) => text.includes(keyword));
  }
}
