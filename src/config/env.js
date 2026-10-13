import 'dotenv/config'
import { z } from 'zod'

export const envSchema = z.object({
    PORT: z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(3000),

    SUPABASE_URL: z.string().url(),
    SUPABASE_SECRET_KEY: z.string().min(1),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
    console.error('Invalid environment configuration:')
    console.error(result.error.issues)
    process.exit(1)
}

export const env = result.data