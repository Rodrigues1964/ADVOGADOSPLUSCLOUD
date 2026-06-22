// src/prisma/prismaClient.ts
import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance for the entire server process
const prisma = new PrismaClient();

export default prisma;
