import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'apps/web/public/decor');
const files = fs.readdirSync(publicDir);
const newFiles = files.filter(f => f.match(/^[a-f0-9-]{36}\.png$/));

const mapping = newFiles.map((f, idx) => ({
  id: f.replace('.png', ''),
  imageUrl: `/decor/${f}`,
  name: `Room Decor ${idx + 1}`
}));

fs.writeFileSync(
  path.join(process.cwd(), 'apps/web/decor-names.json'),
  JSON.stringify(mapping, null, 2)
);

console.log('Mapping file created at apps/web/decor-names.json');
