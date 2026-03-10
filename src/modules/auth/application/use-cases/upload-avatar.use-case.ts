import sharp from 'sharp'
import { Service, Inject, HttpException } from '@/core'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import type { UploadedFile } from '@/core'

const AVATAR_MAX_WIDTH = 256
const AVATAR_QUALITY = 80

@Service()
export class UploadAvatarUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository) {}

  async execute(userId: string, file: UploadedFile): Promise<{ avatarUrl: string }> {
    const user = await this.authRepo.findUserById(userId)
    if (!user) {
      throw HttpException.notFound('User not found')
    }

    // Resize and compress to WebP
    const compressed = await sharp(file.buffer)
      .resize(AVATAR_MAX_WIDTH, AVATAR_MAX_WIDTH, { fit: 'cover' })
      .webp({ quality: AVATAR_QUALITY })
      .toBuffer()

    // Store as a data URI. Replace with cloud storage (S3, etc.) in production.
    const base64 = compressed.toString('base64')
    const avatarUrl = `data:image/webp;base64,${base64}`

    const profile = await this.authRepo.updateAvatarUrl(userId, avatarUrl)
    return { avatarUrl: profile.avatarUrl! }
  }
}
