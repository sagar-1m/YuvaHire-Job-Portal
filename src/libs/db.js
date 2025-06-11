import { PrismaClient } from "../generated/prisma/index.js";

// Creating a global object to hold the Prisma Client instance
const globalForPrisma = globalThis;

// If the Prisma Client instance does not exist, create a new one
const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

// In development mode, assign the Prisma Client instance to the global object
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Export the Prisma Client instance for use in other parts of the application
export default db;
