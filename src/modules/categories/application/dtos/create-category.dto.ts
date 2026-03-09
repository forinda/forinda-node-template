import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).default(''),
})

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>
