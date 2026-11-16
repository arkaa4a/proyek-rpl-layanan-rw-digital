import { PrismaClient } from '@prisma/client';
import path from 'path';

const getDatabaseUrl = () => {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl || envUrl === 'file:./dev.db' || envUrl === 'file:dev.db') {
    const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
    return `file:${dbPath}`;
  }
  return envUrl;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Refresh instance in development if new fields/models were added after server started
const getPrismaInstance = () => {
  if (globalThis.prisma && (globalThis.prisma as any)._profilContactV2) {
    return globalThis.prisma;
  }
  const newClient = prismaClientSingleton();
  (newClient as any)._profilContactV2 = true;
  if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = newClient;
  }
  return newClient;
};

const prisma = getPrismaInstance();

export default prisma;
