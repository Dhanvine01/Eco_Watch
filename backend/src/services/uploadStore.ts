/**
 * LocalUploadStore
 *
 * A clean abstraction over local file storage for inspection images.
 * Replace this class (or swap the exported instance) with a cloud/object
 * storage implementation in production without touching any other code.
 *
 * Files are stored under: <UPLOAD_ROOT>/<inspectionId>/<filename>
 * UPLOAD_ROOT defaults to: backend/uploads/inspections
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Default upload directory relative to the backend working directory
const UPLOAD_ROOT = process.env.UPLOAD_ROOT ?? path.join(process.cwd(), 'uploads', 'inspections');

export interface StoredFile {
  storagePath: string;   // Relative path from UPLOAD_ROOT
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export class LocalUploadStore {
  private root: string;

  constructor(root: string = UPLOAD_ROOT) {
    this.root = root;
    fs.mkdirSync(this.root, { recursive: true });
  }

  /**
   * Save a file buffer to the local upload store.
   * Returns metadata for storing in InspectionImage.
   */
  async save(
    inspectionId: string,
    originalName: string,
    mimeType: string,
    buffer: Buffer
  ): Promise<StoredFile> {
    const dir = path.join(this.root, inspectionId);
    fs.mkdirSync(dir, { recursive: true });

    // Use a random prefix to avoid filename collisions
    const ext = path.extname(originalName) || '.bin';
    const safeName = `${crypto.randomBytes(8).toString('hex')}${ext}`;
    const absolutePath = path.join(dir, safeName);

    fs.writeFileSync(absolutePath, buffer);

    const storagePath = path.join(inspectionId, safeName);
    return { storagePath, originalName, mimeType, sizeBytes: buffer.length };
  }

  /**
   * Return the absolute filesystem path for a stored file.
   * Used by the image-serving endpoint.
   */
  resolve(storagePath: string): string {
    return path.join(this.root, storagePath);
  }

  /**
   * Check whether a stored file exists.
   */
  exists(storagePath: string): boolean {
    return fs.existsSync(this.resolve(storagePath));
  }

  /**
   * Delete a stored file (e.g. when an inspection is deleted).
   */
  delete(storagePath: string): void {
    const abs = this.resolve(storagePath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
}

// Singleton — swap this for a CloudUploadStore in production
export const uploadStore = new LocalUploadStore();
