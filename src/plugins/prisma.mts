import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client/index.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(async (fastify) => {
  const client = new PrismaClient();
  await client.$connect();
  fastify.decorate("prisma", client);

  fastify.addHook("onClose", async () => {
    console.log("closing prisma");

    await client.$disconnect();
  });
});
