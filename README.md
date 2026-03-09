# Node App

A modular Node.js backend built with TypeScript, Express 5, and a Spring Boot-inspired dependency injection framework. Follows Domain-Driven Design (DDD) with a clean separation of concerns across presentation, application, domain, and infrastructure layers.

## Tech Stack

- **Runtime:** Node.js 22 + TypeScript
- **Framework:** Express 5 with custom DI container
- **Database:** PostgreSQL via Drizzle ORM
- **Cache:** Redis (ioredis)
- **Auth:** JWT + bcrypt
- **Validation:** Zod
- **File Upload:** Multer + Sharp (image processing)
- **Real-time:** Socket.IO
- **Email:** Resend
- **Logging:** Pino
- **Docs:** Auto-generated OpenAPI 3.0.3 (Swagger UI + ReDoc)
- **Build:** Vite + SWC
- **Testing:** Vitest + Supertest

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm
- PostgreSQL
- Redis

### Installation

```bash
pnpm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | _(required)_ |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | `change-me-in-production` |
| `JWT_EXPIRATION` | Token expiry | `7d` |
| `RESEND_API_KEY` | Resend email API key | _(optional)_ |

### Database

```bash
# Generate migrations from schema
pnpm db:generate

# Push schema directly (dev)
pnpm db:push

# Run migrations (production)
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio
```

### Development

```bash
pnpm dev
```

Runs with HMR via `vite-node --watch`.

### Build & Run

```bash
pnpm build
pnpm start
```

### Docker

```bash
docker build -t node-app .
docker run -p 3000:3000 --env-file .env node-app
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server with HMR |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Lint source code |
| `pnpm format` | Format source code |

## Project Structure

```
src/
├── core/                        # Framework core
│   ├── adapters/                # Lifecycle adapters (DB, Redis, Socket, Swagger)
│   ├── middleware/              # Validation, file upload
│   ├── services/               # Database, document, mail, printer services
│   ├── swagger/                # OpenAPI spec builder, decorators, UI
│   ├── application.ts          # App bootstrap & server lifecycle
│   ├── container.ts            # IoC / DI container (singleton)
│   ├── context.ts              # RequestContext (wraps Express req/res)
│   ├── decorators.ts           # @Service, @Controller, @Get, @Post, etc.
│   ├── env.ts                  # Zod-validated environment config
│   ├── interfaces.ts           # Scope, TransactionManager, Builder types
│   └── router-builder.ts       # Builds Express routers from decorators
├── db/
│   └── schema/                  # Drizzle table definitions
├── modules/                     # Feature modules (DDD)
│   ├── auth/                    # Authentication (register, login, JWT, avatar)
│   ├── users/                   # User management
│   ├── categories/              # Product categories
│   └── products/                # Products
└── index.ts                     # Entry point
```

Each module follows DDD layers:

```
module/
├── presentation/       # Controllers (HTTP interface)
├── application/        # Use cases, DTOs
│   ├── use-cases/
│   └── dtos/
├── domain/             # Services, repository interfaces
│   ├── services/
│   └── repositories/
└── infrastructure/     # Concrete implementations
    ├── repositories/
    └── middleware/
```

## Core Framework

### Dependency Injection

```typescript
@Service()
class UserService {
  @Autowired() private db!: DatabaseService

  async findAll() {
    return this.db.active.select().from(users)
  }
}
```

### Controllers & Routing

```typescript
@Controller('/users')
@ApiTags('Users')
class UserController {
  @Autowired() private userService!: UserService

  @Get('/')
  @ApiOperation({ summary: 'List all users' })
  async list(ctx: RequestContext) {
    ctx.json(await this.userService.findAll())
  }

  @Post('/', { body: createUserSchema })
  async create(ctx: RequestContext<CreateUserDTO>) {
    ctx.created(await this.userService.create(ctx.body))
  }
}
```

### Transactions

```typescript
@Service()
class OrderService {
  @Transactional()
  async placeOrder(dto: OrderDTO) {
    // All repository calls within this method automatically
    // join the same transaction via AsyncLocalStorage
    await this.orderRepo.save(dto)
    await this.inventoryRepo.decrement(dto.items)
  }
}
```

### File Upload

```typescript
@Patch('/avatar')
@Middleware(authGuard)
@FileUpload({ mode: 'single', fieldName: 'avatar', maxSize: 2 * 1024 * 1024 })
async uploadAvatar(ctx: RequestContext) {
  const file = ctx.file
  // Process with sharp, store, etc.
}
```

### Modules

```typescript
class UserModule implements AppModule {
  register(container: Container) {
    container.registerFactory(USER_REPO, () => container.resolve(DrizzleUserRepository))
  }

  routes(): ModuleRoutes {
    return { path: '/users', router: buildRoutes(UserController), controller: UserController }
  }
}
```

## API Documentation

When the server is running, API docs are available at:

- **Swagger UI:** `http://localhost:3000/docs`
- **ReDoc:** `http://localhost:3000/redoc`
- **OpenAPI JSON:** `http://localhost:3000/docs/spec.json`

## Testing

129 tests covering the entire core framework:

```bash
pnpm test
```

Tests are co-located with source files (`*.test.ts` alongside `*.ts`).

## License

ISC
