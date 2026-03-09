import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
})

export type UpdateUserDTO = z.infer<typeof updateUserSchema>
