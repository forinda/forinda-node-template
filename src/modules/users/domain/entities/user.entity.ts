import { UserId } from '../value-objects/user-id.vo'
import { Email } from '../value-objects/email.vo'

export interface UserProps {
  id: UserId
  name: string
  email: Email
  createdAt: Date
  updatedAt: Date
}

export class User {
  private constructor(private props: UserProps) {}

  static create(params: { name: string; email: string }): User {
    const now = new Date()
    return new User({
      id: UserId.create(),
      name: params.name,
      email: Email.create(params.email),
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(props: UserProps): User {
    return new User(props)
  }

  get id(): UserId {
    return this.props.id
  }

  get name(): string {
    return this.props.name
  }

  get email(): Email {
    return this.props.email
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  changeName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty')
    }
    this.props.name = name.trim()
    this.props.updatedAt = new Date()
  }

  changeEmail(email: string): void {
    this.props.email = Email.create(email)
    this.props.updatedAt = new Date()
  }

  toJSON() {
    return {
      id: this.props.id.toString(),
      name: this.props.name,
      email: this.props.email.toString(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
