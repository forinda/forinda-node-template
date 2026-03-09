import { describe, it, expect } from 'vitest'
import {
  parseFilters,
  parseSort,
  parsePagination,
  parseSearchQuery,
  parseQuery,
  buildFilterParams,
  buildQueryParams,
  standardQuerySchema,
} from './standard-query'

// ── parseFilters ─────────────────────────────────────────────

describe('parseFilters', () => {
  it('returns empty array for undefined', () => {
    expect(parseFilters(undefined)).toEqual([])
  })

  it('parses a single filter string', () => {
    expect(parseFilters('status:eq:active')).toEqual([
      { field: 'status', operator: 'eq', value: 'active' },
    ])
  })

  it('parses an array of filter strings', () => {
    const result = parseFilters(['status:eq:active', 'age:gte:18'])
    expect(result).toEqual([
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'age', operator: 'gte', value: '18' },
    ])
  })

  it('handles all valid operators', () => {
    const ops = [
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'between',
      'in',
      'contains',
      'starts',
      'ends',
    ] as const
    for (const op of ops) {
      const result = parseFilters(`field:${op}:value`)
      expect(result).toHaveLength(1)
      expect(result[0].operator).toBe(op)
    }
  })

  it('preserves values containing colons (e.g. time)', () => {
    const result = parseFilters('time:eq:10:30:00')
    expect(result).toEqual([{ field: 'time', operator: 'eq', value: '10:30:00' }])
  })

  it('skips entries with invalid operator', () => {
    expect(parseFilters('field:badop:value')).toEqual([])
  })

  it('skips entries without enough colons', () => {
    expect(parseFilters('nooperator')).toEqual([])
    expect(parseFilters('field:eq')).toEqual([])
  })

  it('skips entries with empty field', () => {
    expect(parseFilters(':eq:value')).toEqual([])
  })

  it('filters by allowedFields', () => {
    const result = parseFilters(['status:eq:active', 'secret:eq:hidden'], ['status'])
    expect(result).toEqual([{ field: 'status', operator: 'eq', value: 'active' }])
  })

  it('allows all fields when allowedFields is undefined', () => {
    const result = parseFilters('anything:eq:value')
    expect(result).toHaveLength(1)
  })
})

// ── parseSort ────────────────────────────────────────────────

describe('parseSort', () => {
  it('returns empty array for undefined', () => {
    expect(parseSort(undefined)).toEqual([])
  })

  it('parses a single sort string', () => {
    expect(parseSort('name:asc')).toEqual([{ field: 'name', direction: 'asc' }])
  })

  it('parses an array of sort strings', () => {
    const result = parseSort(['name:asc', 'createdAt:desc'])
    expect(result).toEqual([
      { field: 'name', direction: 'asc' },
      { field: 'createdAt', direction: 'desc' },
    ])
  })

  it('is case-insensitive for direction', () => {
    expect(parseSort('name:ASC')).toEqual([{ field: 'name', direction: 'asc' }])
    expect(parseSort('name:DESC')).toEqual([{ field: 'name', direction: 'desc' }])
  })

  it('skips entries with invalid direction', () => {
    expect(parseSort('name:up')).toEqual([])
  })

  it('skips entries without a colon', () => {
    expect(parseSort('nodir')).toEqual([])
  })

  it('skips entries with empty field', () => {
    expect(parseSort(':asc')).toEqual([])
  })

  it('filters by allowedFields', () => {
    const result = parseSort(['name:asc', 'secret:desc'], ['name'])
    expect(result).toEqual([{ field: 'name', direction: 'asc' }])
  })
})

// ── parsePagination ──────────────────────────────────────────

describe('parsePagination', () => {
  it('returns defaults when no params', () => {
    expect(parsePagination({})).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
  })

  it('parses numeric page and limit', () => {
    expect(parsePagination({ page: 3, limit: 10 })).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
    })
  })

  it('parses string page and limit', () => {
    expect(parsePagination({ page: '2', limit: '15' })).toEqual({
      page: 2,
      limit: 15,
      offset: 15,
    })
  })

  it('clamps page < 1 to default', () => {
    expect(parsePagination({ page: 0 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
    expect(parsePagination({ page: -5 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
  })

  it('clamps limit < 1 to default', () => {
    expect(parsePagination({ limit: 0 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
  })

  it('clamps limit > 100 to 100', () => {
    expect(parsePagination({ limit: 500 })).toEqual({
      page: 1,
      limit: 100,
      offset: 0,
    })
  })

  it('handles NaN string values', () => {
    expect(parsePagination({ page: 'abc', limit: 'xyz' })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    })
  })

  it('calculates offset correctly', () => {
    expect(parsePagination({ page: 5, limit: 25 })).toEqual({
      page: 5,
      limit: 25,
      offset: 100,
    })
  })
})

// ── parseSearchQuery ─────────────────────────────────────────

describe('parseSearchQuery', () => {
  it('returns empty string for undefined', () => {
    expect(parseSearchQuery(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(parseSearchQuery('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(parseSearchQuery('  hello  ')).toBe('hello')
  })

  it('truncates to 200 characters', () => {
    const long = 'a'.repeat(300)
    expect(parseSearchQuery(long)).toHaveLength(200)
  })
})

// ── parseQuery ───────────────────────────────────────────────

describe('parseQuery', () => {
  it('parses a full query object', () => {
    const result = parseQuery({
      page: 2,
      limit: 10,
      q: 'john',
      filter: ['status:eq:active', 'age:gte:18'],
      sort: 'name:asc',
    })

    expect(result.pagination).toEqual({ page: 2, limit: 10, offset: 10 })
    expect(result.search).toBe('john')
    expect(result.filters).toHaveLength(2)
    expect(result.sort).toEqual([{ field: 'name', direction: 'asc' }])
  })

  it('returns defaults for empty query', () => {
    const result = parseQuery({})
    expect(result.pagination).toEqual({ page: 1, limit: 20, offset: 0 })
    expect(result.search).toBe('')
    expect(result.filters).toEqual([])
    expect(result.sort).toEqual([])
  })

  it('respects fieldConfig restrictions', () => {
    const result = parseQuery(
      {
        filter: ['status:eq:active', 'secret:eq:x'],
        sort: ['name:asc', 'hidden:desc'],
      },
      {
        filterable: ['status'],
        sortable: ['name'],
      },
    )

    expect(result.filters).toHaveLength(1)
    expect(result.filters[0].field).toBe('status')
    expect(result.sort).toHaveLength(1)
    expect(result.sort[0].field).toBe('name')
  })
})

// ── buildFilterParams ────────────────────────────────────────

describe('buildFilterParams', () => {
  it('builds filter param strings', () => {
    const result = buildFilterParams([
      { field: 'status', operator: 'eq', value: 'active' },
      { field: 'age', operator: 'gte', value: '18' },
    ])
    expect(result).toEqual(['status:eq:active', 'age:gte:18'])
  })

  it('returns empty array for empty input', () => {
    expect(buildFilterParams([])).toEqual([])
  })
})

// ── buildQueryParams ─────────────────────────────────────────

describe('buildQueryParams', () => {
  it('builds complete query params', () => {
    const result = buildQueryParams({
      pagination: { page: 2, limit: 10, offset: 10 },
      search: 'john',
      filters: [{ field: 'status', operator: 'eq', value: 'active' }],
      sort: [{ field: 'name', direction: 'asc' }],
    })

    expect(result).toEqual({
      page: 2,
      limit: 10,
      q: 'john',
      filter: ['status:eq:active'],
      sort: ['name:asc'],
    })
  })

  it('omits empty/missing fields', () => {
    const result = buildQueryParams({})
    expect(result).toEqual({})
  })

  it('omits empty search string', () => {
    const result = buildQueryParams({ search: '' })
    expect(result).toEqual({})
  })

  it('omits empty filter and sort arrays', () => {
    const result = buildQueryParams({ filters: [], sort: [] })
    expect(result).toEqual({})
  })
})

// ── standardQuerySchema ──────────────────────────────────────

describe('standardQuerySchema', () => {
  it('applies defaults', () => {
    const result = standardQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.q).toBeUndefined()
    expect(result.filter).toBeUndefined()
    expect(result.sort).toBeUndefined()
  })

  it('coerces string page and limit to numbers', () => {
    const result = standardQuerySchema.parse({ page: '3', limit: '50' })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
  })

  it('rejects page < 1', () => {
    expect(() => standardQuerySchema.parse({ page: 0 })).toThrow()
  })

  it('rejects limit > 100', () => {
    expect(() => standardQuerySchema.parse({ limit: 101 })).toThrow()
  })

  it('accepts filter as string or array', () => {
    expect(standardQuerySchema.parse({ filter: 'a:eq:b' }).filter).toBe('a:eq:b')
    expect(standardQuerySchema.parse({ filter: ['a:eq:b'] }).filter).toEqual(['a:eq:b'])
  })

  it('accepts sort as string or array', () => {
    expect(standardQuerySchema.parse({ sort: 'name:asc' }).sort).toBe('name:asc')
    expect(standardQuerySchema.parse({ sort: ['name:asc'] }).sort).toEqual(['name:asc'])
  })
})
