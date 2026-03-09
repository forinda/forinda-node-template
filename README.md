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

### Debugging

```bash
# Dev server with Node.js inspector (port 9229)
pnpm dev:debug

# Production build with inspector
pnpm start:debug
```

Then attach your debugger to `localhost:9229`. VSCode launch configurations are included in `.vscode/launch.json`:

- **Debug Dev Server** — launches dev server with auto-attach
- **Attach to Running Server** — attach to an already-running `--inspect` process
- **Debug Production Build** — run and debug the built output
- **Debug Current Test File** — debug the test file open in your editor

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
| `pnpm dev:debug` | Dev server with Node.js inspector |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm start:debug` | Production build with inspector |
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

### Standard Query (Filtering, Sorting & Pagination)

All list endpoints support a standard query string contract for filtering, sorting, pagination, and search. The web/frontend client only needs to pass these query parameters — the backend parses, validates, and converts them to Drizzle ORM queries.

#### Query Parameters

| Parameter | Type | Description | Example |
|---|---|---|---|
| `page` | `number` | Page number (1-based, default `1`) | `?page=2` |
| `limit` | `number` | Items per page (0–100, default `20`) | `?limit=25` |
| `q` | `string` | Free-text search (max 200 chars) | `?q=john` |
| `filter` | `string \| string[]` | Filter expression(s) | `?filter=status:eq:active` |
| `sort` | `string \| string[]` | Sort expression(s) | `?sort=createdAt:desc` |

#### Filter Format

```
filter=<field>:<operator>:<value>
```

Multiple filters are AND-ed. Repeat the parameter for multiple filters:

```
?filter=status:eq:active&filter=age:gte:18
```

| Operator | Description | Example |
|---|---|---|
| `eq` | Equal | `status:eq:active` |
| `neq` | Not equal | `status:neq:deleted` |
| `gt` | Greater than | `age:gt:18` |
| `gte` | Greater than or equal | `age:gte:18` |
| `lt` | Less than | `price:lt:100` |
| `lte` | Less than or equal | `price:lte:100` |
| `between` | Between two values (comma-separated) | `price:between:10,50` |
| `in` | In a list (comma-separated) | `grade:in:A,B,C` |
| `contains` | Case-insensitive substring match | `name:contains:john` |
| `starts` | Starts with (case-insensitive) | `name:starts:joh` |
| `ends` | Ends with (case-insensitive) | `email:ends:@gmail.com` |

Values may contain colons (e.g. `time:eq:10:30:00`) — only the first two colons are split on.

#### Sort Format

```
sort=<field>:<direction>
```

Direction is `asc` or `desc` (case-insensitive). Repeat for multi-column sort:

```
?sort=lastName:asc&sort=createdAt:desc
```

#### Allowed Fields

Each endpoint declares which fields are allowed for filtering, sorting, and searching. Unknown fields are silently ignored. The frontend should reference the endpoint's documentation for available fields.

#### Backend Usage

Controllers access parsed query data via `ctx.qs()`:

```typescript
@Get('/', { query: standardQuerySchema })
@ApiOperation({ summary: 'List students' })
async list(ctx: RequestContext) {
  const parsed = ctx.qs({
    filterable: ['status', 'gender', 'boardingStatus'],
    sortable: ['firstName', 'lastName', 'createdAt'],
    searchable: ['firstName', 'lastName', 'admissionNo'],
  })

  const q = buildDrizzleQuery(parsed, {
    columns: {
      status: students.status,
      gender: students.gender,
      boardingStatus: students.boardingStatus,
      firstName: students.firstName,
      lastName: students.lastName,
      createdAt: students.createdAt,
    },
    searchColumns: [students.firstName, students.lastName, students.admissionNo],
    baseCondition: eq(students.tenantId, tenantId),
  })

  const rows = await db.select().from(students)
    .where(q.where)
    .orderBy(...q.orderBy)
    .limit(q.limit)
    .offset(q.offset)

  ctx.json(rows)
}
```

#### Frontend Examples

```
GET /api/v1/students?page=1&limit=20
GET /api/v1/students?q=john&page=1&limit=10
GET /api/v1/students?filter=status:eq:active&filter=gender:eq:male&sort=lastName:asc
GET /api/v1/students?filter=createdAt:between:2025-01-01,2025-12-31&sort=createdAt:desc&limit=50
```

### Rate Limiting

Built-in via the `RateLimiterAdapter`. Configured per-path or globally:

```typescript
new Application({
  adapters: [
    new RateLimiterAdapter({
      rules: [
        {
          name: 'auth',
          paths: ['/api/v1/auth/login', '/api/v1/auth/register'],
          max: 10,
          windowMs: 15 * 60 * 1000,
          message: { error: 'Too many auth attempts, try again in 15 minutes' },
        },
        { name: 'global', max: 200, windowMs: 15 * 60 * 1000 },
      ],
    }),
  ],
})
```

### CSRF Protection

Double-submit cookie middleware for routes using cookie-based auth:

```typescript
@Post('/')
@Middleware(csrf())
async update(ctx: RequestContext) { ... }
```

Not needed for pure JWT APIs. See [SECURITY.md](SECURITY.md) for details.

### Audit Logging

Structured audit logging via `AuditService` (injectable with `@Autowired()`):

```typescript
@Service()
class LoginUseCase {
  constructor(private readonly audit: AuditService) {}

  async execute(dto: LoginDTO, ip?: string) {
    // ...on success:
    this.audit.success('auth.login', user.email, { ip, resourceId: user.id })
    // ...on failure:
    this.audit.failure('auth.login_failed', dto.email, 'Invalid password', { ip })
  }
}
```

Add custom sinks (database, external API) via `audit.addSink({ name, write })`.

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

399 tests across 50 test files covering the core framework and all feature modules:

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### Test Organization

Tests are co-located with source files (`*.test.ts` alongside `*.ts`):

```
src/
├── core/
│   ├── container.ts
│   ├── container.test.ts          # 22 tests — DI container
│   ├── decorators.ts
│   ├── decorators.test.ts         # 26 tests — all decorators
│   ├── context.ts
│   ├── context.test.ts            # 16 tests — RequestContext
│   ├── ...
├── modules/
│   ├── categories/
│   │   ├── domain/
│   │   │   ├── entities/category.entity.test.ts
│   │   │   ├── value-objects/category-name.vo.test.ts
│   │   │   └── services/category-domain.service.test.ts
│   │   ├── application/use-cases/
│   │   │   ├── create-category.use-case.test.ts
│   │   │   └── ...
│   │   ├── infrastructure/repositories/
│   │   │   └── in-memory-category.repository.test.ts
│   │   └── presentation/
│   │       └── category.controller.test.ts     # HTTP integration
│   └── ... (same pattern for users, products, auth)
```

### Test Layers

| Layer | What to test | How to test |
|---|---|---|
| **Value Objects** | Validation, equality, factory methods | Pure unit tests, no DI |
| **Entities** | State transitions, business rules | Pure unit tests, no DI |
| **Repositories** | CRUD operations, queries | Direct instantiation (in-memory) or mock DB |
| **Domain Services** | Cross-entity logic | Mock repository interfaces |
| **Use Cases** | Orchestration, DTO mapping, error handling | Mock repos via `container.registerInstance(TOKEN, mock)` |
| **Controllers** | HTTP request/response contracts | Supertest + `Application` with `TestModule` |

### Running Specific Tests

```bash
# Single module
pnpm test -- --run src/modules/categories/

# Single file
pnpm test -- --run src/modules/categories/domain/entities/category.entity.test.ts

# Pattern match
pnpm test -- --run -t "should create"
```

## License

ISC
