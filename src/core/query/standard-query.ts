import { eq, ne, gt, gte, lt, lte, between, inArray, ilike, and, or, asc, desc } from 'drizzle-orm'
import type { Column, SQL } from 'drizzle-orm'
import { z } from 'zod/v4'

// ── Types ────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'contains'
  | 'starts'
  | 'ends'

export interface FilterItem {
  field: string
  operator: FilterOperator
  value: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortItem {
  field: string
  direction: SortDirection
}

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface ParsedQuery {
  filters: FilterItem[]
  sort: SortItem[]
  pagination: PaginationParams
  search: string
}

export interface QueryFieldConfig {
  filterable?: string[]
  sortable?: string[]
  searchable?: string[]
}

// ── Zod schema ───────────────────────────────────────────────

/**
 * Standard query parameter schema for all list endpoints.
 *
 * Usage in route decorators:
 * ```ts
 * @Get('/', { query: standardQuerySchema })
 * async list(ctx: RequestContext<unknown, StandardQueryInput>) { ... }
 * ```
 *
 * Query string examples:
 * - `?page=2&limit=25`
 * - `?q=john`
 * - `?filter=status:eq:active&filter=grade:in:1,2,3`
 * - `?sort=firstName:asc&sort=createdAt:desc`
 */
export const standardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(0).max(100).default(20),
  q: z.string().optional(),
  filter: z.union([z.string(), z.array(z.string())]).optional(),
  sort: z.union([z.string(), z.array(z.string())]).optional(),
})

export type StandardQueryInput = z.infer<typeof standardQuerySchema>

// ── Parsers ──────────────────────────────────────────────────

const VALID_OPERATORS: Set<string> = new Set([
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
])

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * Parse filter params from query string.
 * Format: `"field:operator:value"` — can be a single string or array of strings.
 * Values may contain colons (e.g., time `"10:30:00"`) — only the first two colons are split on.
 */
export function parseFilters(
  filterParam: string | string[] | undefined,
  allowedFields?: string[],
): FilterItem[] {
  if (!filterParam) return []

  const raw = Array.isArray(filterParam) ? filterParam : [filterParam]
  const allowedSet = allowedFields ? new Set(allowedFields) : null
  const results: FilterItem[] = []

  for (const entry of raw) {
    const firstColon = entry.indexOf(':')
    if (firstColon === -1) continue
    const secondColon = entry.indexOf(':', firstColon + 1)
    if (secondColon === -1) continue

    const field = entry.slice(0, firstColon).trim()
    const operator = entry.slice(firstColon + 1, secondColon).trim()
    const value = entry.slice(secondColon + 1)

    if (!field || !VALID_OPERATORS.has(operator)) continue
    if (allowedSet && !allowedSet.has(field)) continue

    results.push({ field, operator: operator as FilterOperator, value })
  }

  return results
}

/**
 * Parse sort params from query string.
 * Format: `"field:asc"` or `"field:desc"` — can be a single string or array.
 */
export function parseSort(
  sortParam: string | string[] | undefined,
  allowedFields?: string[],
): SortItem[] {
  if (!sortParam) return []

  const raw = Array.isArray(sortParam) ? sortParam : [sortParam]
  const allowedSet = allowedFields ? new Set(allowedFields) : null
  const results: SortItem[] = []

  for (const entry of raw) {
    const colonIdx = entry.lastIndexOf(':')
    if (colonIdx === -1) continue

    const field = entry.slice(0, colonIdx).trim()
    const dir = entry
      .slice(colonIdx + 1)
      .trim()
      .toLowerCase()

    if (!field || (dir !== 'asc' && dir !== 'desc')) continue
    if (allowedSet && !allowedSet.has(field)) continue

    results.push({ field, direction: dir as SortDirection })
  }

  return results
}

/**
 * Parse and validate pagination params.
 * Accepts both string (pre-Zod) and number (post-Zod coercion) for page/limit.
 */
export function parsePagination(params: {
  page?: string | number
  limit?: string | number
}): PaginationParams {
  let page =
    typeof params.page === 'string' ? parseInt(params.page, 10) : (params.page ?? DEFAULT_PAGE)
  let limit =
    typeof params.limit === 'string' ? parseInt(params.limit, 10) : (params.limit ?? DEFAULT_LIMIT)

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  return { page, limit, offset: (page - 1) * limit }
}

/**
 * Sanitize and trim the search/q param.
 */
export function parseSearchQuery(q: string | undefined): string {
  if (!q || typeof q !== 'string') return ''
  return q.trim().slice(0, 200)
}

/**
 * Parse all query parameters into a structured ParsedQuery.
 * Works with raw Express query objects or post-Zod-validated objects.
 */
export function parseQuery(
  query: Record<string, string | string[] | number | undefined>,
  fieldConfig?: QueryFieldConfig,
): ParsedQuery {
  return {
    filters: parseFilters(query.filter as string | string[] | undefined, fieldConfig?.filterable),
    sort: parseSort(query.sort as string | string[] | undefined, fieldConfig?.sortable),
    pagination: parsePagination({
      page: query.page as string | number | undefined,
      limit: query.limit as string | number | undefined,
    }),
    search: parseSearchQuery(query.q as string | undefined),
  }
}

/**
 * Build filter param strings from FilterItem array.
 * Returns `["field:operator:value", ...]` for URL construction.
 */
export function buildFilterParams(filters: FilterItem[]): string[] {
  return filters.map((f) => `${f.field}:${f.operator}:${f.value}`)
}

/**
 * Convert a (partial) ParsedQuery back to URL-friendly params for fetch/axios.
 */
export function buildQueryParams(
  parsed: Partial<ParsedQuery>,
): Record<string, string | string[] | number> {
  const params: Record<string, string | string[] | number> = {}

  if (parsed.pagination) {
    params.page = parsed.pagination.page
    params.limit = parsed.pagination.limit
  }
  if (parsed.search) {
    params.q = parsed.search
  }
  if (parsed.filters && parsed.filters.length > 0) {
    params.filter = buildFilterParams(parsed.filters)
  }
  if (parsed.sort && parsed.sort.length > 0) {
    params.sort = parsed.sort.map((s) => `${s.field}:${s.direction}`)
  }

  return params
}

// ── Drizzle ORM integration ──────────────────────────────────

export type ColumnMap = Record<string, Column>

export interface DrizzleQueryConfig {
  columns: ColumnMap
  searchColumns?: Column[]
  baseCondition?: SQL
}

export interface DrizzleQueryResult {
  where: SQL | undefined
  orderBy: SQL[]
  limit: number
  offset: number
}

/** ISO date pattern: YYYY-MM-DD (optionally followed by T...) */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T|$)/

/**
 * Coerce a string filter value to match the column's native data type.
 *
 * - boolean columns : 'true' -> true, anything else -> false
 * - number  columns : parsed to Number (NaN falls back to string)
 * - date/timestamp  : ISO strings (YYYY-MM-DD or YYYY-MM-DDTHH:...) -> Date
 * - everything else : string as-is (PostgreSQL will cast if needed)
 */
function coerceValue(col: Column, value: string): unknown {
  const dt = (col as any).dataType as string | undefined
  if (dt === 'boolean') return value === 'true'
  if (dt === 'number') {
    const n = Number(value)
    return Number.isNaN(n) ? value : n
  }
  // Drizzle reports both `timestamp()` and `date()` as dataType 'date'
  if (dt === 'date' && ISO_DATE_RE.test(value)) {
    const d = new Date(value.includes('T') ? value : `${value}T00:00:00`)
    return Number.isNaN(d.getTime()) ? value : d
  }
  return value
}

function buildSingleFilter(filter: FilterItem, col: Column): SQL | undefined {
  const val = coerceValue(col, filter.value)

  switch (filter.operator) {
    case 'eq':
      return eq(col, val)
    case 'neq':
      return ne(col, val)
    case 'gt':
      return gt(col, val)
    case 'gte':
      return gte(col, val)
    case 'lt':
      return lt(col, val)
    case 'lte':
      return lte(col, val)
    case 'between': {
      const [min, max] = filter.value.split(',')
      if (!min || !max) return undefined
      return between(col, coerceValue(col, min.trim()), coerceValue(col, max.trim()))
    }
    case 'in': {
      const values = filter.value.split(',').map((v) => coerceValue(col, v.trim()))
      if (values.length === 0) return undefined
      return inArray(col, values)
    }
    case 'contains':
      return ilike(col, `%${filter.value}%`)
    case 'starts':
      return ilike(col, `${filter.value}%`)
    case 'ends':
      return ilike(col, `%${filter.value}`)
    default:
      return undefined
  }
}

/**
 * Build Drizzle WHERE conditions from parsed filters.
 * Unknown fields (not in ColumnMap) are silently skipped.
 */
export function buildDrizzleFilters(filters: FilterItem[], columns: ColumnMap): SQL | undefined {
  const conditions: SQL[] = []

  for (const filter of filters) {
    const col = columns[filter.field]
    if (!col) continue

    const condition = buildSingleFilter(filter, col)
    if (condition) conditions.push(condition)
  }

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return and(...conditions)
}

/**
 * Build Drizzle search condition (OR-ed ilike across multiple columns).
 */
export function buildDrizzleSearch(search: string, searchColumns: Column[]): SQL | undefined {
  if (!search || searchColumns.length === 0) return undefined

  const conditions = searchColumns.map((col) => ilike(col, `%${search}%`))
  if (conditions.length === 1) return conditions[0]
  return or(...conditions)
}

/**
 * Build Drizzle ORDER BY clauses from parsed sort items.
 */
export function buildDrizzleSort(sortItems: SortItem[], columns: ColumnMap): SQL[] {
  const result: SQL[] = []

  for (const item of sortItems) {
    const col = columns[item.field]
    if (!col) continue
    result.push(item.direction === 'asc' ? asc(col) : desc(col))
  }

  return result
}

/**
 * Build a complete Drizzle query configuration from a ParsedQuery.
 * Combines filters, search, sorting, and pagination into a single result.
 *
 * @example
 * ```ts
 * const parsed = parseQuery(ctx.query, {
 *   filterable: ['status', 'gender', 'boardingStatus'],
 *   sortable: ['firstName', 'lastName', 'createdAt'],
 *   searchable: ['firstName', 'lastName', 'admissionNo'],
 * })
 *
 * const q = buildDrizzleQuery(parsed, {
 *   columns: { status: students.status, gender: students.gender, ... },
 *   searchColumns: [students.firstName, students.lastName, students.admissionNo],
 *   baseCondition: and(eq(students.tenantId, tenantId), eq(students.schoolId, schoolId)),
 * })
 *
 * const rows = await db.select().from(students)
 *   .where(q.where).orderBy(...q.orderBy).limit(q.limit).offset(q.offset)
 * ```
 */
export function buildDrizzleQuery(
  parsed: ParsedQuery,
  config: DrizzleQueryConfig,
): DrizzleQueryResult {
  const filterCondition = buildDrizzleFilters(parsed.filters, config.columns)
  const searchCondition = buildDrizzleSearch(parsed.search, config.searchColumns ?? [])

  const allConditions: SQL[] = []
  if (config.baseCondition) allConditions.push(config.baseCondition)
  if (filterCondition) allConditions.push(filterCondition)
  if (searchCondition) allConditions.push(searchCondition)

  let where: SQL | undefined
  if (allConditions.length === 0) where = undefined
  else if (allConditions.length === 1) where = allConditions[0]
  else where = and(...allConditions)

  const orderBy = buildDrizzleSort(parsed.sort, config.columns)

  return {
    where,
    orderBy,
    limit: parsed.pagination.limit,
    offset: parsed.pagination.offset,
  }
}
