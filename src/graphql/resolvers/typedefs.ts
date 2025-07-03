import { PrismaClient, Role } from "@prisma/client";

export interface Context {
  prisma: PrismaClient;
  user: { sub: string; role: Role } | null;
}
