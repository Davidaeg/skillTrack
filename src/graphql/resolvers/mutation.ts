import { Context } from "./typedefs.ts";

export const Mutation = {
  createModule: async (
    _: unknown,
    args: { title: string; description: string },
    ctx: Context
  ) => {
    const { prisma, user } = ctx;
    // console.log({ user });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Not authorized");
    }
    return prisma.module.create({
      data: { title: args.title, description: args.description },
    });
  },

  updateProgress: async (
    _: unknown,
    { moduleId, progress }: { moduleId: string; progress: number },
    ctx: Context
  ) => {
    const user = ctx.user;
    console.log({ user });

    if (!user) {
      throw new Error("Not authenticated");
    }
    return ctx.prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.sub, moduleId } },
      create: { userId: user.sub, moduleId, progress },
      update: { progress },
    });
  },
};
