import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).default(''),
  price: z.number().nonnegative('Price cannot be negative'),
  currency: z.string().length(3, 'Currency must be a 3-letter code').default('USD'),
  categoryId: z.string().uuid('Invalid category ID'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
})

export type CreateProductDTO = z.infer<typeof createProductSchema>
