import { Repository } from '@/core'
import { Product } from '../../domain/entities/product.entity'
import { ProductId } from '../../domain/value-objects/product-id.vo'
import type { IProductRepository } from '../../domain/repositories/product.repository'

@Repository()
export class InMemoryProductRepository implements IProductRepository {
  private store = new Map<string, Product>()

  async findById(id: ProductId): Promise<Product | null> {
    return this.store.get(id.toString()) ?? null
  }

  async findByCategoryId(categoryId: string): Promise<Product[]> {
    return Array.from(this.store.values()).filter((p) => p.categoryId === categoryId)
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.store.values())
  }

  async save(product: Product): Promise<void> {
    this.store.set(product.id.toString(), product)
  }

  async delete(id: ProductId): Promise<void> {
    this.store.delete(id.toString())
  }
}
