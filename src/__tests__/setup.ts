import 'reflect-metadata'

// Set required env vars for tests before any imports that call loadEnv
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb'
process.env.JWT_SECRET = 'test-secret'
