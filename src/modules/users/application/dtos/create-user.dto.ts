import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
})

export type CreateUserDTO = z.infer<typeof createUserSchema>
