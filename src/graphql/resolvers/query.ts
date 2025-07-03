import { Context } from "./typedefs";

export const Query = {
  me: async (_: unknown, __: unknown, ctx: Context) => {
    const { prisma, user } = ctx;
    if (!user) return null;
    return prisma.user.findUnique({ where: { id: user.sub } });
  },

  modules: async (_: unknown, __: unknown, ctx: Context) => {
    return ctx.prisma.module.findMany();
  },

  myProgress: async (_: unknown, __: unknown, ctx: Context) => {
    const user = ctx.user;
    if (!user) return [];
    return ctx.prisma.userModule.findMany({ where: { userId: user.sub } });
  },
};
