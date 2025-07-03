import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/register",
    {
      schema: { body: registerBody },
      attachValidation: true,
    },
    async (req, reply) => {
      if (req.validationError) {
        return reply.status(400).send(req.validationError);
      }
      const { email, password, name } = registerBody.parse(req.body);
      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({ message: "Email already in use" });
      }
      const hash = await bcrypt.hash(password, 10);
      const user = await app.prisma.user.create({
        data: { email, passwordHash: hash, name, role: "USER" },
      });
      const token = app.jwt.sign({ sub: user.id, role: user.role });
      return reply.send({
        token,
        user: { id: user.id, email, name, role: user.role },
      });
    }
  );

  app.post(
    "/login",
    {
      schema: { body: loginBody },
      attachValidation: true,
    },
    async (req, reply) => {
      if (req.validationError) {
        return reply.status(400).send(req.validationError);
      }
      const { email, password } = loginBody.parse(req.body);
      const user = await app.prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }
      const token = app.jwt.sign({ sub: user.id, role: user.role });
      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }
  );
};
