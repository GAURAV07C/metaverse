const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.space.findMany().then(console.log).finally(() => prisma.\$disconnect());
