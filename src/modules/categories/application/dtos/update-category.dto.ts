import { z } from 'zod'

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
})

export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>
