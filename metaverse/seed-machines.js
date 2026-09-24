const fs = require('fs');
const files = fs.readdirSync('apps/web/public');
const uuids = files.filter(f => /^[0-9a-f]{8}-/.test(f) && f.endsWith('.png'));

let prefabsText = `export interface Prefab {
  title: string;
  kind: string;
  area: string;
  size: string;
  color: string;
  thumb?: string;
  items?: { kind: string; dx: number; dy: number }[];
}

export const prefabs: Prefab[] = [\n`;

uuids.forEach((f, i) => {
  prefabsText += `  { title: 'Machine ${i+1}', kind: 'machine-${i+1}', area: 'Machines', size: '1 x 1', color: '#aaaaaa', thumb: '/${f}' },\n`;
});

prefabsText += `];\n\nimport { Settings } from 'lucide-react';\n\nexport const categories = [\n  { id: 'Machines', icon: Settings },\n];\n\nexport function needsCapacity(area: string): boolean { return false; }\n`;

fs.writeFileSync('apps/web/src/components/studio/prefabs.ts', prefabsText);
console.log(`Added ${uuids.length} machines to prefabs.ts!`);
