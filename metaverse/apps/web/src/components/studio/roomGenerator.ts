import type { ElementItem } from "../admin/adminTypes";
import type { SpaceElement } from "../arena/ElementsPanel";

export function generateDynamicRoomLayout(
  capacity: number,
  availableElements: ElementItem[],
  startGridX = 0,
  startGridY = 0
): {
  width: number;
  height: number;
  elements: SpaceElement[];
} {
  if (!availableElements || availableElements.length === 0) {
    return { width: 5, height: 5, elements: [] };
  }

  // Determine room dimensions based on capacity
  let width = 5;
  let height = 5;
  let tableLength = 1;

  if (capacity <= 2) {
    width = 5;
    height = 5;
    tableLength = 1;
  } else if (capacity <= 4) {
    width = 6;
    height = 5;
    tableLength = 2;
  } else if (capacity <= 8) {
    width = 8;
    height = 6;
    tableLength = 3;
  } else if (capacity <= 12) {
    width = 10;
    height = 7;
    tableLength = 4;
  } else {
    width = 12;
    height = 8;
    tableLength = 5;
  }

  // Strictly select real DB elements from availableElements
  const staticElements = availableElements.filter((e) => e.static);
  const walkableElements = availableElements.filter((e) => !e.static);

  const findRealDbElement = (keywords: string[], isStatic: boolean): ElementItem => {
    const list = isStatic ? staticElements : walkableElements;
    const found = list.find((e) => {
      const text = `${e.name || ""} ${e.imageUrl} ${e.category || ""}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw.toLowerCase()));
    });
    if (found) return found;

    // Fallback to any real DB element of matching static status, or first DB element
    return list[0] || availableElements[0];
  };

  const wallEl = findRealDbElement(["wall", "partition", "fence", "glass", "door"], true);
  const tableEl = findRealDbElement(["table", "desk", "counter", "boardroom"], true);
  const chairEl = findRealDbElement(["chair", "seat", "sofa", "stool", "armchair"], false);
  const screenEl = findRealDbElement(["screen", "tv", "monitor", "arcade", "board"], true);
  const plantEl = findRealDbElement(["plant", "tree", "flower", "pot", "decor", "lamp"], true);

  const elements: SpaceElement[] = [];
  const baseId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 1. Place Walls around perimeter (leave a door gap on bottom wall center)
  const doorX = Math.floor(width / 2);
  for (let c = 0; c < width; c++) {
    for (let r = 0; r < height; r++) {
      const isPerimeter = c === 0 || c === width - 1 || r === 0 || r === height - 1;
      const isDoorGap = r === height - 1 && (c === doorX || c === doorX + 1);

      if (isPerimeter && !isDoorGap) {
        elements.push({
          id: `${baseId}-wall-${c}-${r}`,
          x: startGridX + c,
          y: startGridY + r,
          element: {
            id: wallEl.id,
            width: wallEl.width || 1,
            height: wallEl.height || 1,
            imageUrl: wallEl.imageUrl,
            static: true,
            name: wallEl.name || "Wall",
            category: wallEl.category || "walls",
          },
        });
      }
    }
  }

  // 2. Center Table
  const tableStartX = Math.floor((width - tableLength) / 2);
  const tableCenterY = Math.floor(height / 2);

  for (let t = 0; t < tableLength; t++) {
    elements.push({
      id: `${baseId}-table-${t}`,
      x: startGridX + tableStartX + t,
      y: startGridY + tableCenterY,
      element: {
        id: tableEl.id,
        width: tableEl.width || 1,
        height: tableEl.height || 1,
        imageUrl: tableEl.imageUrl,
        static: true,
        name: tableEl.name || "Table",
        category: tableEl.category || "desks",
      },
    });
  }

  // 3. Arrange N Chairs around the table
  const chairSlots: { x: number; y: number }[] = [];

  // Top side chairs
  for (let t = 0; t < tableLength; t++) {
    chairSlots.push({ x: tableStartX + t, y: tableCenterY - 1 });
  }
  // Bottom side chairs
  for (let t = 0; t < tableLength; t++) {
    chairSlots.push({ x: tableStartX + t, y: tableCenterY + 1 });
  }
  // Left end chairs
  chairSlots.push({ x: tableStartX - 1, y: tableCenterY });
  // Right end chairs
  chairSlots.push({ x: tableStartX + tableLength, y: tableCenterY });

  // Place chairs up to capacity limit
  const activeSeats = chairSlots.slice(0, capacity);
  activeSeats.forEach((slot, idx) => {
    elements.push({
      id: `${baseId}-chair-${idx}`,
      x: startGridX + slot.x,
      y: startGridY + slot.y,
      element: {
        id: chairEl.id,
        width: chairEl.width || 1,
        height: chairEl.height || 1,
        imageUrl: chairEl.imageUrl,
        static: false,
        name: chairEl.name || "Seat",
        category: chairEl.category || "seating",
      },
    });
  });

  // 4. Place Screen on Top Wall center
  if (screenEl) {
    elements.push({
      id: `${baseId}-screen`,
      x: startGridX + Math.floor(width / 2),
      y: startGridY + 1,
      element: {
        id: screenEl.id,
        width: screenEl.width || 1,
        height: screenEl.height || 1,
        imageUrl: screenEl.imageUrl,
        static: true,
        name: screenEl.name || "Screen",
        category: screenEl.category || "electronics",
      },
    });
  }

  // 5. Place Decor Plant in Top-Left Corner
  if (plantEl) {
    elements.push({
      id: `${baseId}-plant`,
      x: startGridX + 1,
      y: startGridY + 1,
      element: {
        id: plantEl.id,
        width: plantEl.width || 1,
        height: plantEl.height || 1,
        imageUrl: plantEl.imageUrl,
        static: true,
        name: plantEl.name || "Plant",
        category: plantEl.category || "decor",
      },
    });
  }

  return { width, height, elements };
}
