"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new client_1.PrismaClient({
    log: [],
});
if (!globalForPrisma.prisma) {
    prisma.$connect()
        .then(() => console.log('Database connection established'))
        .catch((err) => console.error('Failed to connect to database:', err));
}
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
exports.default = prisma;
