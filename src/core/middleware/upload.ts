import multer, { type Options as MulterOptions } from 'multer'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import fs from 'node:fs'

/**
 * Maps short file extensions to their MIME types.
 * Users can pass `['jpg', 'png', 'pdf']` instead of full MIME strings.
 */
const MIME_MAP: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  avif: 'image/avif',
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  txt: 'text/plain',
  csv: 'text/csv',
  // Archives
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  // Other
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
}

/**
 * Resolves a list of file type identifiers to MIME type strings.
 * Accepts short extensions (`'jpg'`, `'pdf'`) or full MIME types (`'image/jpeg'`).
 *
 * @example
 * ```ts
 * resolveMimeTypes(['jpg', 'png', 'application/pdf'])
 * // → ['image/jpeg', 'image/png', 'application/pdf']
 * ```
 */
export function resolveMimeTypes(types: string[]): string[] {
  return types.map((t) => {
    const lower = t.toLowerCase().replace(/^\./, '')
    return MIME_MAP[lower] ?? t
  })
}

/**
 * Represents a single uploaded file, matching the Multer file shape.
 */
export type UploadedFile = Express.Multer.File

/**
 * Configuration for the upload middleware.
 */
export interface UploadOptions {
  /** Field name in the multipart form. Defaults to `'file'`. */
  fieldName?: string
  /** Maximum number of files (for `.array()` uploads). Defaults to `10`. */
  maxCount?: number
  /** Multer storage, limits, and filter options. */
  multerOptions?: MulterOptions
}

/**
 * Express-compatible upload middleware factory.
 *
 * - `'single'` — one file on `req.file`
 * - `'array'`  — multiple files on `req.files`
 * - `'none'`   — no files, only text fields
 *
 * Uploaded files are stored in the OS temp directory by default and
 * automatically cleaned up by {@link cleanupFiles}.
 */
export function upload(
  mode: 'single' | 'array' | 'none',
  options: UploadOptions = {},
): RequestHandler {
  const fieldName = options.fieldName ?? 'file'
  const maxCount = options.maxCount ?? 10
  const m = multer(options.multerOptions ?? { dest: undefined }) // memory storage by default

  switch (mode) {
    case 'single':
      return m.single(fieldName)
    case 'array':
      return m.array(fieldName, maxCount)
    case 'none':
      return m.none()
  }
}

/**
 * Removes temporary files from disk after the response is sent.
 * Attach this as Express middleware after the upload middleware.
 * Works with both `req.file` (single) and `req.files` (array).
 */
export function cleanupFiles() {
  return (_req: Request, res: Response, next: NextFunction) => {
    const req = _req as Request & { file?: UploadedFile; files?: UploadedFile[] }

    res.on('finish', () => {
      const files: UploadedFile[] = []
      if (req.file) files.push(req.file)
      if (Array.isArray(req.files)) files.push(...req.files)

      for (const file of files) {
        if (file.path) {
          fs.unlink(file.path, () => {})
        }
      }
    })

    next()
  }
}
