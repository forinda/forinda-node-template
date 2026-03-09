import { describe, it, expect } from 'vitest'
import { resolveMimeTypes } from './upload'

describe('Upload middleware', () => {
  describe('resolveMimeTypes', () => {
    it('should resolve short extensions to MIME types', () => {
      const result = resolveMimeTypes(['jpg', 'png', 'pdf'])
      expect(result).toEqual(['image/jpeg', 'image/png', 'application/pdf'])
    })

    it('should pass through full MIME types unchanged', () => {
      const result = resolveMimeTypes(['image/jpeg', 'application/json'])
      expect(result).toEqual(['image/jpeg', 'application/json'])
    })

    it('should handle mixed extensions and MIME types', () => {
      const result = resolveMimeTypes(['webp', 'application/pdf', 'gif'])
      expect(result).toEqual(['image/webp', 'application/pdf', 'image/gif'])
    })

    it('should handle case insensitivity', () => {
      const result = resolveMimeTypes(['JPG', 'PNG'])
      expect(result).toEqual(['image/jpeg', 'image/png'])
    })

    it('should strip leading dots', () => {
      const result = resolveMimeTypes(['.jpg', '.png'])
      expect(result).toEqual(['image/jpeg', 'image/png'])
    })

    it('should resolve document types', () => {
      const result = resolveMimeTypes(['doc', 'docx', 'xlsx', 'csv'])
      expect(result).toEqual([
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ])
    })

    it('should resolve audio/video types', () => {
      const result = resolveMimeTypes(['mp3', 'mp4', 'webm'])
      expect(result).toEqual(['audio/mpeg', 'video/mp4', 'video/webm'])
    })

    it('should return the original string for unknown extensions', () => {
      const result = resolveMimeTypes(['custom-type'])
      expect(result).toEqual(['custom-type'])
    })
  })
})
