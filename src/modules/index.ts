import type { AppModuleClass } from '@/core'
import { AuthModule } from './auth'
import { UserModule } from './users'
import { CategoryModule } from './categories'
import { ProductModule } from './products'

export const modules: AppModuleClass[] = [AuthModule, UserModule, CategoryModule, ProductModule]
