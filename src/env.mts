import { z } from "zod";
import { config } from "dotenv";

if (process.env.NODE_ENV === "test") {
  config({ path: ".env.test", override: true });
} else {
  config();
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url().min(1),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(10),
});

export const env = envSchema.parse(process.env);
