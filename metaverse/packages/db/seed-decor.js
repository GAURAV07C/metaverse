var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const prisma = new PrismaClient();
function seedDecor() {
    return __awaiter(this, void 0, void 0, function* () {
        // Read existing seeded files so we don't duplicate
        const existingScript = fs.readFileSync(path.join(process.cwd(), 'packages/db/seed-elements.ts'), 'utf8');
        // Read all files in decor
        const publicDir = path.join(process.cwd(), 'apps/web/public/decor');
        const files = fs.readdirSync(publicDir);
        const newFiles = files.filter(f => f.match(/^[a-f0-9-]{36}\.png$/));
        console.log(`Found ${newFiles.length} files in decor folder.`);
        const elements = newFiles.map((f, idx) => {
            const id = f.replace('.png', '');
            return {
                id,
                name: `Room Decor ${idx + 1}`,
                category: 'Decorations',
                imageUrl: `/decor/${f}`,
                width: 1,
                height: 1,
                static: true,
            };
        });
        for (const el of elements) {
            try {
                yield prisma.element.upsert({
                    where: { id: el.id },
                    update: {},
                    create: el,
                });
                console.log(`Seeded: ${el.name}`);
            }
            catch (e) {
                console.error(`Failed to seed ${el.id}:`, e);
            }
        }
        console.log('Decor seeding complete!');
    });
}
seedDecor()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
//# sourceMappingURL=seed-decor.js.map