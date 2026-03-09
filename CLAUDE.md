# CLAUDE.md

Project-level instructions for Claude Code.

## Project Overview

Node.js backend with TypeScript, Express 5, and a custom Spring Boot-inspired DI framework. Uses DDD (Domain-Driven Design) module architecture.

## Package Manager

**Always use `pnpm`** — never `npm` or `yarn`.

## Code Style

- No semicolons
- Single quotes
- Trailing commas everywhere
- 100 char print width
- 2-space indentation
- LF line endings
- Arrow parens always
- Unused vars prefixed with `_` are allowed

Run `pnpm lint` and `pnpm format` to check/fix.

## Path Aliases

Use `@/*` to import from `src/*`:

```typescript
import { Service, Autowired } from '@/core'
import { users } from '@/db/schema'
```

## Architecture

### Module Structure (DDD)

Every feature module follows this layout:

```
src/modules/<name>/
├── index.ts                  # AppModule implementation
├── presentation/             # Controllers
├── application/
│   ├── use-cases/            # Business logic orchestration
│   └── dtos/                 # Zod schemas + types
├── domain/
│   ├── services/             # Pure domain logic
│   └── repositories/         # Interface definitions + DI tokens
└── infrastructure/
    ├── repositories/         # Drizzle implementations
    └── middleware/            # Route guards, etc.
```

### Module Registration Pattern

```typescript
// Use import.meta.glob to eagerly load services & use-cases
import.meta.glob(['./domain/services/**/*.ts', './application/use-cases/**/*.ts'], { eager: true })

export class MyModule implements AppModule {
  register(container: Container): void {
    // Use registerFactory for lazy resolution (avoids DI timing issues)
    container.registerFactory(MY_REPO, () => container.resolve(DrizzleMyRepository))
  }
  routes(): ModuleRoutes {
    return { path: '/my-resource', router: buildRoutes(MyController), controller: MyController }
  }
}
```

### Key Decorators

- **Class:** `@Service()`, `@Controller('/path')`, `@Repository()`, `@Configuration()`, `@Component()`
- **DI:** `@Autowired()`, `@Inject(TOKEN)`, `@Value('ENV_KEY')`
- **HTTP:** `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()` with optional Zod validation
- **Middleware:** `@Middleware(handler)`, `@FileUpload({ mode, fieldName, maxSize })`
- **Lifecycle:** `@PostConstruct()`, `@Transactional()`
- **Swagger:** `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`, `@ApiExclude()`

### Database

- Drizzle ORM with PostgreSQL (postgres.js driver)
- Schema in `src/db/schema/`
- All repository queries must use `this.db.active` (not `this.db.db`) to support transparent transaction propagation via AsyncLocalStorage
- `@Transactional()` decorator handles begin/commit/rollback automatically

### Middleware Signature

Framework middleware uses `(ctx: RequestContext, next: () => void)`, NOT Express `(req, res, next)`:

```typescript
const guard: MiddlewareHandler = async (ctx, next) => {
  if (!ctx.headers.authorization) return ctx.res.status(401).json({ error: 'Unauthorized' })
  next()
}
```

### Request Context

Controllers receive `RequestContext` (not Express req/res):
- `ctx.body`, `ctx.params`, `ctx.query`, `ctx.headers`
- `ctx.file` / `ctx.files` for uploads
- `ctx.get(key)` / `ctx.set(key, value)` for metadata
- `ctx.json()`, `ctx.created()`, `ctx.noContent()`, `ctx.notFound()`, `ctx.badRequest()`

## Testing

- **Framework:** Vitest + Supertest
- **Tests co-located** with source: `*.test.ts` next to `*.ts`
- **Setup file:** `src/__tests__/setup.ts` (sets `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=test`)
- **Run:** `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`

### DI Test Isolation

Always call `Container.reset()` in `beforeEach`. This wipes all registrations including those from `@Service()` decorators at module-load time. After reset, you must re-register classes explicitly:

```typescript
beforeEach(() => {
  Container.reset()
  const container = Container.getInstance()
  container.register(MyService, MyService)
  container.registerInstance(MY_REPO, mockRepo)
})
```

### Testing by Layer

**Value objects / entities** — pure unit tests, no DI:
```typescript
it('should validate name', () => {
  expect(() => CategoryName.create('')).toThrow()
})
```

**Use cases** — mock the repository via DI:
```typescript
const mockRepo: Partial<ICategoryRepository> = {
  findById: vi.fn().mockResolvedValue(someCategory),
}
container.registerInstance(CATEGORY_REPOSITORY, mockRepo)
```

**Controller integration** — use a `TestModule` that explicitly registers all dependencies:
```typescript
class TestMyModule implements AppModule {
  register(container: Container): void {
    // Must register EVERY class in the dependency chain
    container.register(InMemoryMyRepository, InMemoryMyRepository)
    container.register(MyDomainService, MyDomainService)
    container.register(CreateMyUseCase, CreateMyUseCase)
    // ... all use cases ...
    container.register(MyController, MyController)
    const repo = container.resolve(InMemoryMyRepository)
    container.registerInstance(MY_REPOSITORY, repo)
  }
  routes(): ModuleRoutes {
    return { path: '/my-resource', router: buildRoutes(MyController), controller: MyController }
  }
}

// Then in test:
app = new Application({
  modules: [TestMyModule as AppModuleClass],
  helmet: false, cors: false, compression: false, morgan: false,
})
;(app as any).setup()
const expressApp = app.getExpressApp()
await request(expressApp).get('/api/v1/my-resource/').expect(200)
```

### Known Limitation

The framework creates **separate `RequestContext` instances** for middleware and handler (see `router-builder.ts`). This means `ctx.set()` in middleware is NOT visible to `ctx.get()` in the handler. Test middleware side-effects via response headers or status codes instead.

### Glob Exclusion

Module `import.meta.glob` patterns must exclude test files to prevent `vi.mock()` from crashing the runtime:
```typescript
import.meta.glob(['./domain/services/**/*.ts', '!./**/*.test.ts'], { eager: true })
```

## Database Commands

```bash
pnpm db:generate   # Generate migrations from schema
pnpm db:push       # Push schema directly (dev)
pnpm db:migrate    # Run migrations (production)
pnpm db:studio     # Drizzle Studio GUI
```

## Commit Style

Imperative mood, present tense. First line summarizes the change. Details in body if needed:

```
Add user profile avatar upload endpoint

Integrate sharp for image compression, store as base64 WebP data URI.
```

## Common Pitfalls

1. **DI timing**: Use `registerFactory()` (lazy) instead of eagerly resolving in `register()` — adapters like DatabaseAdapter may not have run yet.
2. **DatabaseAdapter lifecycle**: Runs in `beforeMount` (step 1), not `beforeStart`. This ensures it's available when modules resolve dependencies.
3. **`DATABASE_URL` is required**: The env schema requires it. Always set it, even in tests.
4. **Decorator execution order**: TypeScript decorators execute bottom-up. `@ApiResponse` stacking order is reversed from source order.
5. **`@Value` and class fields**: SWC class field initialization can shadow prototype getters created by `@Value`. Access via prototype descriptor if needed.
