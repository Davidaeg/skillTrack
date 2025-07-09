import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import fastify, { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env } from "@env";
import { SwaggerTheme, SwaggerThemeNameEnum } from "swagger-themes";
import { prismaPlugin } from "@plugins/prisma.mts";
import { authRoutes } from "@routes/auth.mts";
import { verifyJWT } from "@utils/auth.mts";
import { mercurius } from "mercurius";
import { schema } from "@/graphql/schema.mjs";
import { Context } from "@/graphql/resolvers/typedefs.mjs";
import { Query } from "@/graphql/resolvers/query.mjs";
import { Mutation } from "@/graphql/resolvers/mutation.mjs";

export const app = fastify().withTypeProvider<ZodTypeProvider>();

const theme = new SwaggerTheme();
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK);

app.register(cors, {
  origin: "*",
});

app.register(prismaPlugin);

app.register(fastifySwagger, {
  swagger: {
    consumes: ["application/json"],
    produces: ["application/json"],
    info: {
      title: "Blog API",
      description: "API for my blog project.",
      version: "1.0.0",
    },
  },
});

app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
  theme: {
    css: [{ filename: "theme.css", content: content }],
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false,
  },
});

app.get("/health", async () => ({ status: "ok" }));
app.register(authRoutes, { prefix: "/auth" });

app.register(async (fastify: FastifyInstance) => {
  fastify.setValidatorCompiler(() => () => ({
    value: undefined,
    error: undefined,
  }));
  fastify.setSerializerCompiler(() => {
    return (payload: any) => JSON.stringify(payload);
  });

  fastify.addHook("preValidation", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      console.log("Unauthorized");
      reply.status(401).send({ error: "Unauthorized" });
    }
  });

  fastify.register(mercurius as any, {
    schema,
    resolvers: { Query, Mutation },
    context: (request: any) => {
      const user = (request.user as Context["user"]) ?? null;
      return { prisma: fastify.prisma, user } as Context;
    },
    graphiql: true,
  });
});

app.get("/protected", { preHandler: [verifyJWT] }, async (req, reply) => {
  const userId = (req.user as any).sub;
  return {
    status: "ok",
    userId,
  };
});

const start = async () => {
  app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
    console.log("Server running on port " + env.PORT);
  });
};

start();
