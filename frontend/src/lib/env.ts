import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().trim().url().or(z.literal('')).default(''),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`)
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_URL.replace(/\/+$/, ''),
}
