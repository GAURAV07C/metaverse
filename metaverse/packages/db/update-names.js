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
function updateNames() {
    return __awaiter(this, void 0, void 0, function* () {
        const mappingPath = path.join(process.cwd(), 'apps/web/decor-names.json');
        if (!fs.existsSync(mappingPath)) {
            console.error('Mapping file not found at', mappingPath);
            process.exit(1);
        }
        const data = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        let updatedCount = 0;
        for (const item of data) {
            if (item.name && !item.name.startsWith('Room Decor')) {
                yield prisma.element.update({
                    where: { id: item.id },
                    data: { name: item.name }
                });
                console.log(`Updated ${item.id} -> ${item.name}`);
                updatedCount++;
            }
        }
        console.log(`Successfully updated ${updatedCount} items.`);
    });
}
updateNames()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
//# sourceMappingURL=update-names.js.map