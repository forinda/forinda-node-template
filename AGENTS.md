# AGENTS.md

Instructions for AI agents working on this codebase.

## Codebase Summary

This is a Node.js TypeScript backend with a custom DI (dependency injection) framework inspired by Spring Boot / NestJS. It uses Express 5 under the hood but abstracts it behind decorators and a `RequestContext` pattern.

## Before You Start

1. Always use `pnpm` (not npm/yarn)
2. Read `CLAUDE.md` for project conventions
3. Run `pnpm test` after making changes to verify nothing breaks
4. Run `pnpm typecheck` to verify type correctness

## Architecture Rules

### Adding a New Module

1. Create the directory structure under `src/modules/<name>/`:
   - `index.ts` — implements `AppModule`
   - `presentation/<name>.controller.ts`
   - `application/use-cases/` — one class per use case
   - `application/dtos/` — Zod schemas for validation
   - `domain/repositories/<name>.repository.ts` — interface + Symbol token
   - `domain/services/` — pure business logic
   - `infrastructure/repositories/drizzle-<name>.repository.ts`

2. Register the module in `src/modules/index.ts`

3. If adding DB tables, add schema in `src/db/schema/` and export from `src/db/schema/index.ts`

### Adding a New Endpoint

1. Add the route handler method to the controller with `@Get`, `@Post`, etc.
2. If it needs validation, create a Zod schema DTO and pass it: `@Post('/', { body: mySchema })`
3. If it needs auth, add `@Middleware(authGuard)` and `@ApiBearerAuth()`
4. If it's a complex operation, create a use case class with `@Service()` and inject the repository

### Adding a Repository Method

1. Define the method signature in the domain interface (`IMyRepository`)
2. Implement it in the infrastructure repository using `this.db.active` for all queries
3. Always use `this.db.active` — never `this.db.db` directly — to support `@Transactional()` propagation

## Key Patterns

### Dependency Injection

```typescript
// Register interface → implementation via factory (lazy)
container.registerFactory(MY_REPO, () => container.resolve(DrizzleMyRepository))

// Inject by token in constructor
constructor(@Inject(MY_REPO) private readonly repo: IMyRepository) {}

// Inject by type via property
@Autowired() private readonly myService!: MyService
```

### Controller Pattern

```typescript
@Controller()
@ApiTags('Resources')
export class ResourceController {
  @Autowired() private myUseCase!: MyUseCase

  @Get('/')
  @ApiOperation({ summary: 'List resources' })
  async list(ctx: RequestContext) {
    ctx.json(await this.myUseCase.execute())
  }

  @Post('/', { body: createSchema })
  @Middleware(authGuard)
  @ApiBearerAuth()
  async create(ctx: RequestContext<CreateDTO>) {
    ctx.created(await this.myUseCase.execute(ctx.body))
  }
}
```

### Use Case Pattern

```typescript
@Service()
export class CreateResourceUseCase {
  constructor(
    @Inject(RESOURCE_REPO) private readonly repo: IResourceRepository,
  ) {}

  @Transactional()  // Optional: wraps in DB transaction
  async execute(dto: CreateDTO) {
    // Business logic here
    return this.repo.create(dto)
  }
}
```

## File Naming Conventions

- Controllers: `<name>.controller.ts`
- Use cases: `<action>-<resource>.use-case.ts` (e.g., `create-order.use-case.ts`)
- DTOs: `<name>.dto.ts`
- Repositories: `<name>.repository.ts` (interface), `drizzle-<name>.repository.ts` (implementation)
- Services: `<name>.service.ts`
- Tests: `<name>.test.ts` (co-located with source)
- DB schema: `<table-name>.ts` (plural, kebab-case)

## Testing Guidelines

### General Rules

- Tests live alongside source files (`*.test.ts`)
- Use `Container.reset()` in `beforeEach` for any test using DI
- For HTTP tests, use `supertest` with the Express app directly (no need to start server)
- Disable middleware (helmet, cors, compression, morgan) in Application tests for cleaner assertions
- Mock external services (DB, Redis) — don't require live connections for unit tests
- The test setup (`src/__tests__/setup.ts`) provides `DATABASE_URL` and `JWT_SECRET` env vars

### Testing a Module (layer by layer, bottom-up)

#### 1. Value Objects (pure unit tests)

Test file: `domain/value-objects/<name>.vo.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { Email } from './email.vo'

describe('Email', () => {
  it('should create from valid address', () => {
    expect(Email.create('user@test.com').toString()).toBe('user@test.com')
  })
  it('should reject invalid address', () => {
    expect(() => Email.create('invalid')).toThrow()
  })
})
```

No DI needed. Test validation, equality, `toString()`, factory methods.

#### 2. Entities (pure unit tests)

Test file: `domain/entities/<name>.entity.test.ts`

Test `create()`, `reconstitute()`, mutation methods (`changeName()`, etc.), and validation errors.

#### 3. Repositories (direct instantiation)

Test file: `infrastructure/repositories/<name>.repository.test.ts`

For in-memory repos, instantiate directly. For Drizzle repos, mock the database or skip (integration test territory).

```typescript
const repo = new InMemoryCategoryRepository()
const category = Category.create({ name: 'Test', description: '' })
await repo.save(category)
expect(await repo.findById(category.id)).toBeDefined()
```

#### 4. Domain Services (mock repository interface)

Test file: `domain/services/<name>.service.test.ts`

```typescript
const mockRepo: Partial<ICategoryRepository> = {
  findByName: vi.fn().mockResolvedValue(null),
  save: vi.fn(),
}
const container = Container.getInstance()
container.register(CategoryDomainService, CategoryDomainService)
container.registerInstance(CATEGORY_REPOSITORY, mockRepo)
const service = container.resolve(CategoryDomainService)
```

#### 5. Use Cases (mock repo via DI)

Test file: `application/use-cases/<name>.use-case.test.ts`

One test file per use case. Register mock repos, test happy path and error cases.

```typescript
beforeEach(() => {
  Container.reset()
  const container = Container.getInstance()
  container.register(GetCategoryUseCase, GetCategoryUseCase)
  container.registerInstance(CATEGORY_REPOSITORY, mockRepo)
})
```

For use cases with `@Transactional()`, also register a mock `TransactionManager`:
```typescript
import { TRANSACTION_MANAGER } from '@/core/interfaces'
container.registerInstance(TRANSACTION_MANAGER, {
  begin: async () => ({}),
  commit: async () => {},
  rollback: async () => {},
})
```

#### 6. Controller Integration (HTTP via supertest)

Test file: `presentation/<name>.controller.test.ts`

**Critical**: After `Container.reset()`, `@Service()` decorator-time registrations are wiped. You must create a `TestModule` that explicitly registers ALL classes in the dependency chain:

```typescript
class TestCategoryModule implements AppModule {
  register(container: Container): void {
    container.register(InMemoryCategoryRepository, InMemoryCategoryRepository)
    container.register(CategoryDomainService, CategoryDomainService)
    container.register(CreateCategoryUseCase, CreateCategoryUseCase)
    container.register(GetCategoryUseCase, GetCategoryUseCase)
    // ... every use case and service ...
    container.register(CategoryController, CategoryController)
    const repo = container.resolve(InMemoryCategoryRepository)
    container.registerInstance(CATEGORY_REPOSITORY, repo)
  }
  routes(): ModuleRoutes {
    return {
      path: '/categories',
      router: buildRoutes(CategoryController),
      controller: CategoryController,
    }
  }
}
```

Then in the test:
```typescript
beforeEach(() => {
  Container.reset()
  app = new Application({
    modules: [TestCategoryModule as AppModuleClass],
    helmet: false, cors: false, compression: false, morgan: false,
  })
  ;(app as any).setup()
  expressApp = app.getExpressApp()
})
```

### Known Pitfalls for Tests

1. **`Container.reset()` wipes everything** — including `@Service()` and `@Controller()` registrations that happened at module load time. Always re-register explicitly.
2. **Separate `RequestContext` instances** — middleware and handler get different `RequestContext` objects, so `ctx.set()` in middleware is lost in the handler. Test middleware effects via response headers/status.
3. **`import.meta.glob` loads test files** — module `index.ts` globs must include `'!./**/*.test.ts'` to exclude test files, otherwise `vi.mock()` crashes the runtime.
4. **`@Transactional()` needs a `TransactionManager`** — register a mock one in tests for use cases that use this decorator.

### Running Tests

```bash
pnpm test                                    # All tests
pnpm test -- --run src/modules/categories/   # One module
pnpm test -- --run src/core/                 # Core framework only
pnpm test:watch                              # Watch mode
pnpm test:coverage                           # Coverage report
```

## Don't

- Don't use `npm` — use `pnpm`
- Don't import from Express directly in controllers — use `RequestContext`
- Don't use `this.db.db` in repositories — use `this.db.active`
- Don't eagerly resolve dependencies in `register()` — use `registerFactory()` for lazy resolution
- Don't create REST endpoints without Swagger decorators (`@ApiTags`, `@ApiOperation`)
- Don't skip the use-case layer — controllers should delegate to use cases, not contain business logic
- Don't write middleware with Express `(req, res, next)` signature — use `(ctx: RequestContext, next: () => void)`
