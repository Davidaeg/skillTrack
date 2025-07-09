// src/server.mts
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler
} from "fastify-type-provider-zod";

// src/env.mts
import { z } from "zod";
import { config } from "dotenv";
if (process.env.NODE_ENV === "test") {
  config({ path: ".env.test", override: true });
} else {
  config();
}
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().min(1),
  PORT: z.coerce.number().default(3e3),
  JWT_SECRET: z.string().min(10)
});
var env = envSchema.parse(process.env);

// src/server.mts
import { SwaggerTheme, SwaggerThemeNameEnum } from "swagger-themes";

// src/plugins/prisma.mts
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client/index.js";
var prismaPlugin = fp(async (fastify2) => {
  const client = new PrismaClient();
  await client.$connect();
  fastify2.decorate("prisma", client);
  fastify2.addHook("onClose", async () => {
    console.log("closing prisma");
    await client.$disconnect();
  });
});

// src/routes/auth.mts
import { z as z2 } from "zod";
import bcrypt from "bcrypt";
var registerBody = z2.object({
  email: z2.string().email(),
  password: z2.string().min(6),
  name: z2.string().optional()
});
var loginBody = z2.object({
  email: z2.string().email(),
  password: z2.string()
});
var authRoutes = async (app2) => {
  app2.post(
    "/register",
    {
      schema: { body: registerBody },
      attachValidation: true
    },
    async (req, reply) => {
      if (req.validationError) {
        return reply.status(400).send(req.validationError);
      }
      const { email, password, name } = registerBody.parse(req.body);
      const existing = await app2.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ message: "Email already in use" });
      }
      const hash = await bcrypt.hash(password, 10);
      const user = await app2.prisma.user.create({
        data: { email, passwordHash: hash, name, role: "USER" }
      });
      const token = app2.jwt.sign({ sub: user.id, role: user.role });
      return reply.send({
        token,
        user: { id: user.id, email, name, role: user.role }
      });
    }
  );
  app2.post(
    "/login",
    {
      schema: { body: loginBody },
      attachValidation: true
    },
    async (req, reply) => {
      if (req.validationError) {
        return reply.status(400).send(req.validationError);
      }
      const { email, password } = loginBody.parse(req.body);
      const user = await app2.prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }
      const token = app2.jwt.sign({ sub: user.id, role: user.role });
      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }
  );
};

// src/utils/auth.mts
async function verifyJWT(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.send(err);
  }
}

// src/server.mts
import { mercurius } from "mercurius";

// src/graphql/schema.ts
var schema = `
  enum Role {
    USER
    ADMIN
  }

  type User {
    id: ID!
    name: String
    email: String!
    role: Role!
  }

  type Module {
    id: ID!
    title: String!
    description: String!
    createdAt: String!
    updatedAt: String!
  }

  type UserModule {
    id: ID!
    module: Module!
    progress: Int!
  }

  type Query {
    me: User
    modules: [Module!]!
    myProgress: [UserModule!]!
  }

  type Mutation {
    createModule(title: String!, description: String!): Module!
    updateProgress(moduleId: ID!, progress: Int!): UserModule!
  }
`;

// src/graphql/resolvers/query.ts
var Query = {
  me: async (_, __, ctx) => {
    const { prisma, user } = ctx;
    if (!user) return null;
    return prisma.user.findUnique({ where: { id: user.sub } });
  },
  modules: async (_, __, ctx) => {
    return ctx.prisma.module.findMany();
  },
  myProgress: async (_, __, ctx) => {
    const user = ctx.user;
    if (!user) return [];
    return ctx.prisma.userModule.findMany({ where: { userId: user.sub } });
  }
};

// src/graphql/resolvers/mutation.ts
var Mutation = {
  createModule: async (_, args, ctx) => {
    const { prisma, user } = ctx;
    if (!user || user.role !== "ADMIN") {
      throw new Error("Not authorized");
    }
    return prisma.module.create({
      data: { title: args.title, description: args.description }
    });
  },
  updateProgress: async (_, { moduleId, progress }, ctx) => {
    const user = ctx.user;
    console.log({ user });
    if (!user) {
      throw new Error("Not authenticated");
    }
    return ctx.prisma.userModule.upsert({
      where: { userId_moduleId: { userId: user.sub, moduleId } },
      create: { userId: user.sub, moduleId, progress },
      update: { progress }
    });
  }
};

// src/server.mts
var app = fastify().withTypeProvider();
var theme = new SwaggerTheme();
var content = theme.getBuffer(SwaggerThemeNameEnum.DARK);
app.register(cors, {
  origin: "*"
});
app.register(prismaPlugin);
app.register(fastifySwagger, {
  swagger: {
    consumes: ["application/json"],
    produces: ["application/json"],
    info: {
      title: "Blog API",
      description: "API for my blog project.",
      version: "1.0.0"
    }
  }
});
app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
  theme: {
    css: [{ filename: "theme.css", content }]
  }
});
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: "token",
    signed: false
  }
});
app.get("/health", async () => ({ status: "ok" }));
app.register(authRoutes, { prefix: "/auth" });
app.register(async (fastify2) => {
  fastify2.setValidatorCompiler(() => () => ({
    value: void 0,
    error: void 0
  }));
  fastify2.setSerializerCompiler(() => {
    return (payload) => JSON.stringify(payload);
  });
  fastify2.addHook("preValidation", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      console.log("Unauthorized");
      reply.status(401).send({ error: "Unauthorized" });
    }
  });
  fastify2.register(mercurius, {
    schema,
    resolvers: { Query, Mutation },
    context: (request) => {
      const user = request.user ?? null;
      return { prisma: fastify2.prisma, user };
    },
    graphiql: true
  });
});
app.get("/protected", { preHandler: [verifyJWT] }, async (req, reply) => {
  const userId = req.user.sub;
  return {
    status: "ok",
    userId
  };
});
var start = async () => {
  app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
    console.log("Server running on port " + env.PORT);
  });
};
start();
export {
  app
};
//# sourceMappingURL=server.js.map