import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Database client instance
 * Uses global variable in development to prevent multiple instances
 */
export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

/**
 * Database connection utility functions
 */
export class DatabaseService {
  static async checkConnection(): Promise<boolean> {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error("Database connection failed:", error);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    await db.$disconnect();
  }
}

export default db;
