import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.php', '.py', '.rb', '.ps1', '.jar'];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/zip' // zip is the base for xlsx/docx
];

function detectMimeTypeFromBuffer(buffer: Buffer, ext: string): string | null {
  // 1. PDF: %PDF (0x25504446)
  if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x25504446) {
    return 'application/pdf';
  }
  // 2. PNG: 0x89504E470D0A1A0A
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504E47 && buffer.readUInt32BE(4) === 0x0D0A1A0A) {
    return 'image/png';
  }
  // 3. JPEG: 0xFFD8FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // 4. ZIP/Office: PK.. (0x504B0304)
  if (buffer.length >= 4 && buffer.readUInt32BE(0) === 0x504B0304) {
    if (ext === '.xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    if (ext === '.docx') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return 'application/zip';
  }
  return null;
}

export const validateFileUpload = (options: { maxSizeBytes?: number } = {}) => {
  return async (req: any, res: Response, next: NextFunction): Promise<any> => {
    try {
      const file = req.file;
      if (!file) {
        return next();
      }

      const envMaxMb = Number(process.env.MAX_UPLOAD_SIZE_MB || '10');
      const resolvedMaxSize = options.maxSizeBytes ?? (envMaxMb * 1024 * 1024);

      // 1. Size check
      if (file.size > resolvedMaxSize) {
        cleanupFile(file);
        return res.status(400).json({
          success: false,
          message: `File size exceeds the limit of ${resolvedMaxSize / (1024 * 1024)}MB`
        });
      }

      // 2. Extension blocklist
      const ext = path.extname(file.originalname).toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        cleanupFile(file);
        return res.status(400).json({
          success: false,
          message: `File extension ${ext} is dangerous and not allowed`
        });
      }

      // 3. Read buffer to perform magic bytes check
      let buffer: Buffer;
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path) {
        if (!fs.existsSync(file.path)) {
          return res.status(400).json({ success: false, message: 'Uploaded file not found on disk' });
        }
        buffer = await fs.promises.readFile(file.path);
      } else {
        return res.status(400).json({ success: false, message: 'Invalid upload file structure' });
      }

      // 4. Magic-bytes check
      const detectedMime = detectMimeTypeFromBuffer(buffer, ext);

      let mime = file.mimetype;
      if (detectedMime) {
        mime = detectedMime;
      } else {
        // Plain text, csv, or json files don't have binary magic headers.
        const isTextExtension = ['.txt', '.csv', '.json'].includes(ext);
        if (!isTextExtension) {
          cleanupFile(file);
          return res.status(400).json({
            success: false,
            message: `Invalid file content for extension ${ext}`
          });
        }

        // Sneaky binary check: text files shouldn't contain null bytes
        if (buffer.includes(0)) {
          cleanupFile(file);
          return res.status(400).json({
            success: false,
            message: 'Binary content detected in text file'
          });
        }

        // Validate JSON format if extension is .json
        if (ext === '.json') {
          try {
            JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            cleanupFile(file);
            return res.status(400).json({
              success: false,
              message: 'Invalid JSON format'
            });
          }
        }
      }

      // Ensure mime type is in the allowed list
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        cleanupFile(file);
        return res.status(400).json({
          success: false,
          message: `Mime type ${mime} is not allowed`
        });
      }

      // Check if mimetype matches requested file extension
      if (ext === '.pdf' && mime !== 'application/pdf') {
        cleanupFile(file);
        return res.status(400).json({ success: false, message: 'File is not a valid PDF' });
      }
      if (ext === '.png' && mime !== 'image/png') {
        cleanupFile(file);
        return res.status(400).json({ success: false, message: 'File is not a valid PNG image' });
      }
      if (ext === '.jpg' || ext === '.jpeg') {
        if (mime !== 'image/jpeg') {
          cleanupFile(file);
          return res.status(400).json({ success: false, message: 'File is not a valid JPEG image' });
        }
      }

      return next();
    } catch (err: any) {
      logger.error('[FileUploadValidation] Unexpected error during validation:', err);
      if (req.file) {
        cleanupFile(req.file);
      }
      return res.status(500).json({ success: false, message: 'Internal validation error' });
    }
  };
};

function cleanupFile(file: any) {
  if (file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (e: any) {
      logger.warn(`Failed to cleanup invalid file at ${file.path}:`, e.message);
    }
  }
}
