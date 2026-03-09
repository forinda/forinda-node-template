# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. Do **not** open a public issue. Instead, email the maintainers directly with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge receipt within 48 hours and aim to release a fix within 7 days for critical issues.

## Security Architecture

### Authentication

- **JWT** — Stateless tokens issued on login/register with configurable expiration (`JWT_EXPIRATION`, default `7d`).
- **bcrypt** — Passwords are hashed with bcrypt at **12 salt rounds** before storage. Plain-text passwords are never persisted or logged.
- **Auth guard** — Protected routes use the `authGuard` middleware, which verifies the `Authorization: Bearer <token>` header and attaches the decoded payload to the request context.

### Input Validation

- **Zod schemas** — Every endpoint validates `body`, `query`, and `params` against Zod schemas before the handler executes. Invalid input returns `422` with structured error details.
- **Standard query parsing** — Filter, sort, and search parameters are parsed through a whitelist of allowed fields per endpoint. Unknown fields are silently ignored, preventing injection of arbitrary query conditions.

### Security Headers

- **Helmet** — Enabled by default. Sets `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and other protective headers.
- **X-Powered-By** — Disabled to avoid fingerprinting the framework.
- **Trust Proxy** — Configurable for deployments behind reverse proxies (load balancers, Nginx) so `X-Forwarded-*` headers are read correctly.

### CORS

CORS is enabled by default. In production, configure explicit origins:

```typescript
new Application({
  cors: {
    origin: ['https://your-app.com'],
    credentials: true,
  },
})
```

### File Uploads

- **Size limits** — Default max 5 MB per file, configurable per endpoint (e.g. avatar uploads are capped at 2 MB).
- **MIME type filtering** — Endpoints declare allowed MIME types; files with disallowed types are rejected before processing.
- **Temp file cleanup** — Uploaded files are automatically removed from disk after the response is sent.
- **Image processing** — Avatar uploads are resized (256x256) and re-encoded to WebP via Sharp, stripping EXIF metadata.

### Error Handling

- **Global error handler** — Catches unhandled exceptions to prevent server crashes. Returns generic error messages to clients in production.
- **No stack traces in responses** — Stack traces are logged server-side only, never sent to clients.
- **Auth error messages** — Login failures return `"Invalid email or password"` regardless of whether the email exists, preventing user enumeration.

### Rate Limiting

Rate limiting is built-in via the `RateLimiterAdapter`, powered by `express-rate-limit`.

- **Auth endpoints** — `/login` and `/register` are limited to **10 requests / 15 minutes** per IP to prevent brute-force attacks.
- **Global** — All other endpoints are limited to **200 requests / 15 minutes** per IP.
- **Standard headers** — `RateLimit-*` headers are sent so clients know their quota.

Configured in `src/index.ts` via the adapter:

```typescript
new RateLimiterAdapter({
  rules: [
    {
      name: 'auth',
      paths: ['/api/v1/auth/login', '/api/v1/auth/register'],
      max: 10,
      windowMs: 15 * 60 * 1000,
    },
    { name: 'global', max: 200, windowMs: 15 * 60 * 1000 },
  ],
})
```

### CSRF Protection

A double-submit cookie middleware is available for routes consumed by browsers with cookie-based auth:

```typescript
@Post('/')
@Middleware(csrf())
async update(ctx: RequestContext) { ... }
```

**How it works:** A random token is set in a cookie (`csrf-token`). On state-changing requests (POST, PUT, DELETE, PATCH), the client must send the same token in the `X-CSRF-Token` header. Mismatches return `403`.

**When to use:** Only needed for cookie-based auth flows. Pure JWT APIs (Authorization header) are not vulnerable to CSRF because browsers don't auto-attach the header cross-origin.

### Audit Logging

All authentication events are logged via the `AuditService` with structured Pino output:

| Event | Logged When |
|---|---|
| `auth.login` | Successful login |
| `auth.login_failed` | Invalid email, wrong password, or deactivated account |
| `auth.register` | Successful registration |
| `auth.register_failed` | Email already in use |
| `auth.token_invalid` | JWT verification failure in auth guard |

Each audit entry includes: `action`, `actor` (email), `ip`, `success`, `reason` (on failure), and `timestamp`.

**Custom sinks:** The default sink logs to Pino (stdout). Add additional sinks for persistence:

```typescript
const audit = container.resolve(AuditService)
audit.addSink({
  name: 'database',
  async write(entry) {
    await db.insert(auditLogs).values(entry)
  },
})
```

### Environment & Secrets

- **Zod-validated env** — Required variables (`DATABASE_URL`, `JWT_SECRET`) are validated at startup. The server refuses to start with missing or malformed configuration.
- **`.env` excluded from version control** — The `.gitignore` includes `.env`. Only `.env.example` with placeholder values is committed.

## Production Checklist

Before deploying to production, verify the following:

### Required

- [ ] Set a strong, unique `JWT_SECRET` (at least 32 random characters). **Do not use the default.**
- [ ] Set `NODE_ENV=production`
- [ ] Configure explicit CORS origins (do not allow `*`)
- [ ] Use HTTPS termination (via reverse proxy or load balancer)
- [ ] Set `DATABASE_URL` to a connection string with a dedicated, least-privilege database user
- [ ] Rotate `JWT_SECRET` periodically and have a key rotation strategy

### Recommended

- [ ] Review and tune **rate limiting** thresholds for your traffic patterns
- [ ] Add **CSRF protection** if any routes use cookie-based auth (the `csrf()` middleware is available)
- [ ] Add a **database audit sink** to persist audit logs beyond stdout
- [ ] Move file storage from data URIs to a cloud object store (S3, GCS, R2) for production workloads
- [ ] Configure **request size limits** on the reverse proxy (Nginx `client_max_body_size`, etc.)
- [ ] Enable **database connection encryption** (SSL/TLS) via the `DATABASE_URL` `?sslmode=require` parameter
- [ ] Run `pnpm audit` regularly to check for known vulnerabilities in dependencies

## Dependencies

Key security-related packages:

| Package | Purpose | Version |
|---|---|---|
| `bcryptjs` | Password hashing (12 salt rounds) | 3.x |
| `helmet` | Security headers (CSP, HSTS, etc.) | 8.x |
| `jsonwebtoken` | JWT signing & verification | 9.x |
| `zod` | Input validation & schema enforcement | 4.x |
| `cors` | Cross-Origin Resource Sharing | 2.x |
| `multer` | File upload handling with limits | 2.x |
| `sharp` | Image processing & metadata stripping | 0.34.x |
| `express-rate-limit` | Request rate limiting | 8.x |
| `cookie-parser` | Cookie parsing for CSRF | 1.x |

## Supported Versions

| Version | Supported |
|---|---|
| latest `main` | Yes |
| older commits | No |
