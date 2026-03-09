import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from '../container'
import { Controller, Get, Post, Patch, Middleware, FileUpload } from '../decorators'
import type { RequestContext, MiddlewareHandler } from '../index'
import { METADATA } from '../interfaces'
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiExclude,
  SWAGGER_METADATA,
} from './decorators'
import {
  buildOpenAPISpec,
  registerControllerForDocs,
  clearRegisteredRoutes,
} from './openapi-builder'
import { z } from 'zod'

describe('Swagger Decorators', () => {
  describe('@ApiOperation', () => {
    it('should store operation metadata on method', () => {
      class Ctrl {
        @ApiOperation({ summary: 'Get items', description: 'Returns all items' })
        @Get('/')
        list() {}
      }

      const meta = Reflect.getMetadata(SWAGGER_METADATA.API_OPERATION, Ctrl.prototype, 'list')
      expect(meta.summary).toBe('Get items')
      expect(meta.description).toBe('Returns all items')
    })
  })

  describe('@ApiResponse', () => {
    it('should store response metadata on method', () => {
      class Ctrl {
        @ApiResponse({ status: 200, description: 'Success' })
        @ApiResponse({ status: 404, description: 'Not found' })
        @Get('/')
        list() {}
      }

      const meta = Reflect.getMetadata(SWAGGER_METADATA.API_RESPONSE, Ctrl.prototype, 'list')
      expect(meta).toHaveLength(2)
      // Decorators execute bottom-up, so 404 is pushed first, then 200
      const statuses = meta.map((m: any) => m.status)
      expect(statuses).toContain(200)
      expect(statuses).toContain(404)
    })
  })

  describe('@ApiTags', () => {
    it('should store tags on class', () => {
      @ApiTags('Users', 'Admin')
      class Ctrl {}

      const tags = Reflect.getMetadata(SWAGGER_METADATA.API_TAGS, Ctrl)
      expect(tags).toEqual(['Users', 'Admin'])
    })

    it('should store tags on method', () => {
      class Ctrl {
        @ApiTags('Special')
        @Get('/')
        handler() {}
      }

      const tags = Reflect.getMetadata(SWAGGER_METADATA.API_TAGS, Ctrl.prototype, 'handler')
      expect(tags).toEqual(['Special'])
    })
  })

  describe('@ApiBearerAuth', () => {
    it('should store bearer auth on class', () => {
      @ApiBearerAuth()
      class Ctrl {}

      const name = Reflect.getMetadata(SWAGGER_METADATA.API_BEARER_AUTH, Ctrl)
      expect(name).toBe('BearerAuth')
    })

    it('should store bearer auth on method', () => {
      class Ctrl {
        @ApiBearerAuth('CustomAuth')
        @Get('/')
        handler() {}
      }

      const name = Reflect.getMetadata(
        SWAGGER_METADATA.API_BEARER_AUTH,
        Ctrl.prototype,
        'handler',
      )
      expect(name).toBe('CustomAuth')
    })
  })

  describe('@ApiExclude', () => {
    it('should store exclude metadata on class', () => {
      @ApiExclude()
      class Ctrl {}

      expect(Reflect.getMetadata(SWAGGER_METADATA.API_EXCLUDE, Ctrl)).toBe(true)
    })

    it('should store exclude metadata on method', () => {
      class Ctrl {
        @ApiExclude()
        @Get('/')
        handler() {}
      }

      expect(
        Reflect.getMetadata(SWAGGER_METADATA.API_EXCLUDE, Ctrl.prototype, 'handler'),
      ).toBe(true)
    })
  })
})

describe('buildOpenAPISpec', () => {
  beforeEach(() => {
    Container.reset()
    clearRegisteredRoutes()
  })

  it('should produce a valid OpenAPI 3.0.3 base spec', () => {
    const spec = buildOpenAPISpec({
      info: { title: 'Test API', version: '2.0.0' },
    })

    expect(spec.openapi).toBe('3.0.3')
    expect(spec.info.title).toBe('Test API')
    expect(spec.info.version).toBe('2.0.0')
    expect(spec.paths).toEqual({})
    expect(spec.components.schemas).toEqual({})
  })

  it('should register routes and produce paths', () => {
    @Controller()
    @ApiTags('Items')
    class ItemCtrl {
      @Get('/')
      @ApiOperation({ summary: 'List items' })
      list() {}

      @Post('/', { body: z.object({ name: z.string() }) })
      @ApiOperation({ summary: 'Create item' })
      create() {}
    }

    registerControllerForDocs(ItemCtrl, '/api/v1/items')

    const spec = buildOpenAPISpec()

    expect(spec.paths['/api/v1/items']).toBeDefined()
    expect(spec.paths['/api/v1/items'].get).toBeDefined()
    expect(spec.paths['/api/v1/items'].get.summary).toBe('List items')
    expect(spec.paths['/api/v1/items'].post).toBeDefined()
    expect(spec.paths['/api/v1/items'].post.summary).toBe('Create item')

    // POST should have requestBody with JSON schema
    expect(spec.paths['/api/v1/items'].post.requestBody).toBeDefined()
    expect(spec.paths['/api/v1/items'].post.requestBody.content['application/json']).toBeDefined()
  })

  it('should handle path parameters', () => {
    @Controller()
    class ItemCtrl {
      @Get('/:id')
      getOne() {}
    }

    registerControllerForDocs(ItemCtrl, '/api/v1/items')

    const spec = buildOpenAPISpec()
    const path = spec.paths['/api/v1/items/{id}']
    expect(path).toBeDefined()
    expect(path.get.parameters).toBeDefined()
    expect(path.get.parameters[0].name).toBe('id')
    expect(path.get.parameters[0].in).toBe('path')
    expect(path.get.parameters[0].required).toBe(true)
  })

  it('should generate default responses based on HTTP method', () => {
    @Controller()
    class Ctrl {
      @Get('/')
      list() {}

      @Post('/')
      create() {}
    }

    registerControllerForDocs(Ctrl, '/api/v1/test')

    const spec = buildOpenAPISpec()
    const path = spec.paths['/api/v1/test']
    expect(path.get.responses['200']).toBeDefined()
    expect(path.post.responses['201']).toBeDefined()
  })

  it('should include bearer auth security scheme when used', () => {
    @Controller()
    @ApiBearerAuth()
    class Ctrl {
      @Get('/')
      list() {}
    }

    registerControllerForDocs(Ctrl, '/api/v1/secure')

    const spec = buildOpenAPISpec()
    expect(spec.components.securitySchemes).toBeDefined()
    expect(spec.components.securitySchemes!['BearerAuth']).toBeDefined()
    expect(spec.components.securitySchemes!['BearerAuth'].type).toBe('http')
    expect(spec.components.securitySchemes!['BearerAuth'].scheme).toBe('bearer')
  })

  it('should exclude controllers with @ApiExclude', () => {
    @Controller()
    @ApiExclude()
    class InternalCtrl {
      @Get('/')
      handler() {}
    }

    registerControllerForDocs(InternalCtrl, '/api/v1/internal')

    const spec = buildOpenAPISpec()
    expect(spec.paths['/api/v1/internal']).toBeUndefined()
  })

  it('should handle @FileUpload with multipart/form-data schema', () => {
    @Controller()
    class UploadCtrl {
      @Patch('/avatar')
      @FileUpload({ mode: 'single', fieldName: 'avatar' })
      upload() {}
    }

    registerControllerForDocs(UploadCtrl, '/api/v1/users')

    const spec = buildOpenAPISpec()
    const op = spec.paths['/api/v1/users/avatar']?.patch
    expect(op).toBeDefined()
    expect(op.requestBody.content['multipart/form-data']).toBeDefined()
    const schema = op.requestBody.content['multipart/form-data'].schema
    expect(schema.properties.avatar).toEqual({ type: 'string', format: 'binary' })
  })

  it('should use @ApiResponse overrides instead of defaults', () => {
    @Controller()
    class Ctrl {
      @Get('/')
      @ApiResponse({ status: 200, description: 'OK list' })
      @ApiResponse({ status: 500, description: 'Server error' })
      list() {}
    }

    registerControllerForDocs(Ctrl, '/api/v1/items')

    const spec = buildOpenAPISpec()
    const responses = spec.paths['/api/v1/items'].get.responses
    expect(responses['200'].description).toBe('OK list')
    expect(responses['500'].description).toBe('Server error')
  })

  it('should add tags from class and method level', () => {
    @Controller()
    @ApiTags('Products')
    class Ctrl {
      @Get('/')
      list() {}
    }

    registerControllerForDocs(Ctrl, '/api/v1/products')

    const spec = buildOpenAPISpec()
    expect(spec.tags.map((t) => t.name)).toContain('Products')
    expect(spec.paths['/api/v1/products'].get.tags).toContain('Products')
  })
})
