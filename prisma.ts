import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [],
})

if (!globalForPrisma.prisma) {
  prisma.$connect()
    .then(() => console.log('Database connection established'))
    .catch((err) => console.error('Failed to connect to database:', err))
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma