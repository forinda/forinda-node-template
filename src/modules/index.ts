import type { AppModuleClass } from '@/core'
import { UserModule } from './users'
import { CategoryModule } from './categories'
import { ProductModule } from './products'

export const modules: AppModuleClass[] = [UserModule, CategoryModule, ProductModule]
