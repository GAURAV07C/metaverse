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
const prisma = new PrismaClient();
function wipe() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.spaceElements.deleteMany({});
        yield prisma.mapElements.deleteMany({});
        yield prisma.element.deleteMany({});
        console.log("Database wiped successfully!");
    });
}
wipe().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=wipe.js.map