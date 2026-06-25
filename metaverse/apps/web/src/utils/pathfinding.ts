interface Point {
  x: number;
  y: number;
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start to current node
  h: number; // Heuristic cost from current node to end
  f: number; // Total cost (g + h)
  parent: Node | null;
}

export function findPath(
  start: Point,
  target: Point,
  width: number,
  height: number,
  isWalkable: (x: number, y: number) => boolean
): Point[] {
  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: Node = {
    x: start.x,
    y: start.y,
    g: 0,
    h: Math.abs(start.x - target.x) + Math.abs(start.y - target.y), // Manhattan distance
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f cost
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIndex].f) {
        lowestIndex = i;
      }
    }

    const current = openSet[lowestIndex];

    // If reached target
    if (current.x === target.x && current.y === target.y) {
      const path: Point[] = [];
      let temp: Node | null = current;
      while (temp !== null) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse(); // Return path from start to end
    }

    openSet.splice(lowestIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    // Check neighbors (Up, Down, Left, Right)
    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
    ];

    for (const neighbor of neighbors) {
      // Out of bounds
      if (neighbor.x < 0 || neighbor.y < 0 || neighbor.x >= width || neighbor.y >= height) {
        continue;
      }

      // If already evaluated or not walkable
      if (closedSet.has(`${neighbor.x},${neighbor.y}`) || !isWalkable(neighbor.x, neighbor.y)) {
        continue;
      }

      const gScore = current.g + 1;
      let neighborNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

      if (!neighborNode) {
        neighborNode = {
          x: neighbor.x,
          y: neighbor.y,
          g: gScore,
          h: Math.abs(neighbor.x - target.x) + Math.abs(neighbor.y - target.y),
          f: 0,
          parent: current,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openSet.push(neighborNode);
      } else if (gScore < neighborNode.g) {
        // Found a better path to this node
        neighborNode.g = gScore;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  // No path found
  return [];
}
