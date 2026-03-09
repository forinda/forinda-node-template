import { CategoryId } from '../value-objects/category-id.vo'
import { CategoryName } from '../value-objects/category-name.vo'

export interface CategoryProps {
  id: CategoryId
  name: CategoryName
  description: string
  createdAt: Date
  updatedAt: Date
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(params: { name: string; description: string }): Category {
    const now = new Date()
    return new Category({
      id: CategoryId.create(),
      name: CategoryName.create(params.name),
      description: params.description ?? '',
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props)
  }

  get id(): CategoryId {
    return this.props.id
  }

  get name(): CategoryName {
    return this.props.name
  }

  get description(): string {
    return this.props.description
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  changeName(name: string): void {
    this.props.name = CategoryName.create(name)
    this.props.updatedAt = new Date()
  }

  changeDescription(description: string): void {
    this.props.description = description
    this.props.updatedAt = new Date()
  }

  toJSON() {
    return {
      id: this.props.id.toString(),
      name: this.props.name.toString(),
      description: this.props.description,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
