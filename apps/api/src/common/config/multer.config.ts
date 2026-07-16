import { randomUUID } from 'crypto';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

// Security-conscious multer config for inventory item images.
//
// - Only real image MIME types accepted (jpeg/png/webp) — checked against
//   the browser-reported mimetype AND the file extension, since either one
//   alone can be spoofed by a malicious client.
// - 5MB hard limit — generous for a photo, small enough to resist someone
//   using this endpoint to fill disk/bandwidth (part of what the multer DoS
//   CVEs we just patched were about — this is a second, independent layer
//   of defense, not a replacement for keeping multer itself patched).
// - Filenames are never taken from the client. A random UUID is generated
//   server-side, so there's no path-traversal risk from a crafted filename
//   (e.g. "../../../etc/passwd") and no collision between two members
//   uploading a file with the same name.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const inventoryImageMulterOptions = {
  storage: diskStorage({
    destination: './uploads/inventory',
    filename: (_req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: any, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      callback(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
      return;
    }
    callback(null, true);
  },
};
