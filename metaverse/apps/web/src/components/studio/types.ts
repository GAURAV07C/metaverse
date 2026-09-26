export interface Prefab {
  title: string;
  kind: string;
  area: string;
  size: string;
  color: string;
  thumb?: string;
  items?: { kind: string; dx: number; dy: number }[];
}

export interface AreaType {
  id: string;
  name: string;
  floor: string; // hex color or texture id
  color: string; // border/fill color
  texture?: 'solid' | 'grid' | 'checker' | 'lines'; // type of floor pattern
  x: number;
  y: number;
  w: number;
  h: number;
}
