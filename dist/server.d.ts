import * as http from 'http';
import fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

declare const app: fastify.FastifyInstance<http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>, http.IncomingMessage, http.ServerResponse<http.IncomingMessage>, fastify.FastifyBaseLogger, ZodTypeProvider>;

export { app };
