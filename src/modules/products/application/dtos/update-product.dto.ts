import { z } from 'zod'

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().nonnegative('Price cannot be negative').optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  stock: z.number().int().nonnegative('Stock cannot be negative').optional(),
})

export type UpdateProductDTO = z.infer<typeof updateProductSchema>
