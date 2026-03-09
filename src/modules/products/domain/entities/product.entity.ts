import { ProductId } from '../value-objects/product-id.vo'
import { Money } from '../value-objects/money.vo'

export interface ProductProps {
  id: ProductId
  name: string
  description: string
  price: Money
  categoryId: string
  stock: number
  createdAt: Date
  updatedAt: Date
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(params: {
    name: string
    description: string
    price: number
    currency?: string
    categoryId: string
    stock: number
  }): Product {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Product name cannot be empty')
    }
    if (params.stock < 0) {
      throw new Error('Stock cannot be negative')
    }

    const now = new Date()
    return new Product({
      id: ProductId.create(),
      name: params.name.trim(),
      description: params.description ?? '',
      price: Money.create(params.price, params.currency),
      categoryId: params.categoryId,
      stock: params.stock,
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props)
  }

  get id(): ProductId {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get description(): string {
    return this.props.description
  }

  get price(): Money {
    return this.props.price
  }

  get categoryId(): string {
    return this.props.categoryId
  }

  get stock(): number {
    return this.props.stock
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  changeName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Product name cannot be empty')
    }
    this.props.name = name.trim()
    this.props.updatedAt = new Date()
  }

  changeDescription(description: string): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  changePrice(amount: number, currency?: string): void {
    this.props.price = Money.create(amount, currency ?? this.props.price.getCurrency())
    this.props.updatedAt = new Date()
  }

  changeCategory(categoryId: string): void {
    this.props.categoryId = categoryId
    this.props.updatedAt = new Date()
  }

  adjustStock(quantity: number): void {
    const newStock = this.props.stock + quantity
    if (newStock < 0) {
      throw new Error('Insufficient stock')
    }
    this.props.stock = newStock
    this.props.updatedAt = new Date()
  }

  toJSON() {
    return {
      id: this.props.id.toString(),
      name: this.props.name,
      description: this.props.description,
      price: this.props.price.toJSON(),
      categoryId: this.props.categoryId,
      stock: this.props.stock,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
