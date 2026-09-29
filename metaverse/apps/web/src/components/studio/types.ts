export interface Prefab {
  title: string;
  kind: string;
  area: string;
  size: string;
  color: string;
  thumb?: string;
  items?: { kind: string; dx: number; dy: number }[];
  variants?: any;
  templateElements?: { elementId: string; x: number; y: number }[];
  templateAreas?: AreaType[];
}

export interface AreaType {
  id: string;
  name: string;
  type?: 'public' | 'private' | 'seat';
  floor: string; // hex color or texture id
  color: string; // border/fill color
  texture?: 'solid' | 'grid' | 'checker' | 'stripes' | 'dots' | 'planks' | 'hex' | 'zigzag' | 'tiles'; // type of floor pattern
  x: number;
  y: number;
  w: number;
  h: number;
}
