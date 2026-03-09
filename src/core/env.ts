import 'dotenv/config'
import { z } from 'zod'

/**
 * Zod schema defining all required and optional environment variables.
 * Validated at startup via {@link loadEnv} to ensure the application
 * has a fully typed, parsed configuration object before proceeding.
 *
 * Add new environment variables here -- Zod will enforce types and defaults.
 */
export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database (PostgreSQL)
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().default(0),
  REDIS_ENABLE_SUBSCRIBER: z
    .enum(['true', 'false', '1', '0'])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),

  // JWT
  JWT_SECRET: z.string().default('change-me-in-production'),
  JWT_EXPIRATION: z.string().default('7d'),

  // Mail (Resend)
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('noreply@example.com'),
})

/** Inferred TypeScript type from the {@link envSchema}, representing all validated environment values. */
export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

/**
 * Parses and validates `process.env` against the {@link envSchema}.
 * The result is cached after the first successful call, so it is safe
 * and inexpensive to call multiple times.
 *
 * @returns The fully validated and typed environment configuration.
 * @throws {Error} If any environment variable fails validation, with a formatted
 *   list of all issues.
 *
 * @example
 * ```ts
 * const env = loadEnv();
 * console.log(env.PORT); // number
 * ```
 */
export function loadEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables:\n${formatted}`)
  }
  _env = result.data
  return _env
}

/**
 * Retrieves a single typed environment value by key.
 * Calls {@link loadEnv} internally on first access to ensure validation has run.
 *
 * @typeParam K - A key of the {@link Env} type.
 * @param key - The environment variable name to retrieve.
 * @returns The validated value for the given key.
 *
 * @example
 * ```ts
 * const port = getEnv('PORT'); // typed as number
 * ```
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return loadEnv()[key]
}
